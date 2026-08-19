/** Interactive Avti terminal frontend over the existing Harness headless composition. */

import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  installModelSelection,
  type Agent,
  type AgentHandle,
  type ModelSelectionRef,
} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import { createAvtiActivity, type AvtiActivity } from './avti-terminal-style.ts'
import { packagedDependencyPath } from './packaged-runtime-path.ts'

const PROFILE_BOOT_URL = pathToFileURL(
  packagedDependencyPath(import.meta.url, '@deepseek-ai/dsh/lib/profile-boot.js'),
).href

const INTERACTIVE_PATCH = `# Avti terminal owns the human-facing loop; Harness keeps the runtime composition.
- id: headless-startup
  disabled: true
- id: headless-runner
  disabled: true
`

interface ProfileBootModule {
  runProfile(options: {
    environment: ReturnType<typeof loadLayeredEnv>
    profile: string
    patchFiles: readonly string[]
    args: readonly string[]
  }): Promise<{ ctx: Context }>
}

interface TurnPresentationState {
  streamedText: boolean
  endsWithNewline: boolean
  turnError?: string
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function assistantText(event: SessionEvent<'assistant/message'>): string {
  return event.data.message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('')
}

function showActivity(activity: AvtiActivity, label: string): void {
  activity.update(label)
  activity.start(label)
}

function renderSessionEvent(
  event: SessionEvent,
  activity: AvtiActivity,
  state: TurnPresentationState,
): void {
  if (event.type === 'assistant/chunk') {
    const chunk = event.data.chunk
    switch (chunk.type) {
      case 'text-delta':
        activity.stop()
        process.stdout.write(chunk.text)
        state.streamedText = true
        state.endsWithNewline = chunk.text.endsWith('\n')
        return
      case 'reasoning-delta':
        showActivity(activity, 'Thinking')
        return
      case 'tool-call-delta':
        if (chunk.name !== undefined && chunk.name !== '') showActivity(activity, `Using ${chunk.name}`)
        return
      case 'block-start':
        if (chunk.blockType === 'reasoning') showActivity(activity, 'Thinking')
        return
      case 'block-end':
      case 'usage':
      case 'finish':
        return
    }
  }

  if (event.type === 'tool/call') {
    showActivity(activity, `Using ${event.data.name}`)
    return
  }

  if (event.type === 'assistant/message') {
    if (!state.streamedText) {
      const text = assistantText(event)
      if (text !== '') {
        activity.stop()
        process.stdout.write(text)
        state.streamedText = true
        state.endsWithNewline = text.endsWith('\n')
      }
    }
    return
  }

  if (event.type === 'turn/end' && event.data.reason.kind === 'error') {
    state.turnError = `${event.data.reason.error.code}: ${event.data.reason.error.message}`
  }
}

async function presentTurn(agent: Agent, firstEventIndex: number): Promise<void> {
  const activity = createAvtiActivity()
  const state: TurnPresentationState = { streamedText: false, endsWithNewline: false }
  let eventIndex = firstEventIndex
  let settled = false
  const idle = agent.whenIdle().finally(() => { settled = true })

  activity.start('Thinking')

  const drain = (): void => {
    const events = agent.session.events
    while (eventIndex < events.length) {
      const event = events[eventIndex]
      eventIndex += 1
      if (event !== undefined) renderSessionEvent(event, activity, state)
    }
  }

  while (!settled) {
    drain()
    await Promise.race([idle, sleep(35)])
  }
  await idle
  drain()
  activity.stop()

  if (state.streamedText && !state.endsWithNewline) process.stdout.write('\n')
  if (state.turnError !== undefined) process.stderr.write(`  × ${state.turnError}\n`)
  process.stdout.write('\n')
}

async function bootInteractiveProfile(): Promise<Context> {
  const root = mkdtempSync(join(tmpdir(), 'avti-cli-'))
  const patchPath = join(root, 'interactive.patch.yml')
  writeFileSync(patchPath, INTERACTIVE_PATCH)
  try {
    const module = await import(PROFILE_BOOT_URL) as unknown as ProfileBootModule
    const { ctx } = await module.runProfile({
      environment: loadLayeredEnv('dsh'),
      profile: 'headless',
      patchFiles: [patchPath],
      args: [],
    })
    return ctx
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/** Run one persistent Harness Agent behind Avti's minimalist terminal frontend. */
export async function runAvtiInteractive(): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new Error('interactive mode requires a terminal; pass a task as an argument for one-shot mode')
  }

  const ctx = await bootInteractiveProfile()
  let handle: AgentHandle | undefined
  const readline = createInterface({ input: process.stdin, output: process.stdout, terminal: true })

  try {
    await ctx.get('loader')?.await()
    const agents = ctx.get('agents')
    const defaultModel = ctx.get('agentDefaultModel')
    const sessions = ctx.get('sessions')
    if (agents === undefined || defaultModel === undefined || sessions === undefined) {
      throw new Error('Avti profile did not provide the required agent services')
    }

    const selection = defaultModel.currentSelection()
    const selected: ModelSelectionRef = { current: selection, assembled: undefined }
    handle = await agents.create({
      sessionId: SessionId(`avti-${randomUUID()}`),
      meta: { cwd: process.cwd() },
      agentOptions: { provider: selection.provider, model: selection.model },
      setup: agentCtx => { installModelSelection(agentCtx, selected) },
    })
    const agent = handle.agent
    await agent.whenIdle()

    process.stdout.write(`${process.cwd()} · ${selection.model}\n\n`)

    while (true) {
      let task: string
      try {
        task = await readline.question('› ')
      } catch {
        break
      }
      const trimmed = task.trim()
      if (trimmed === '') continue
      if (trimmed === '/exit' || trimmed === '/quit') break
      if (trimmed === '/help') {
        process.stdout.write('  /help  show terminal commands\n  /exit  leave Avti\n\n')
        continue
      }

      const firstEventIndex = agent.session.events.length
      agent.followup(createUserMessage({
        content: [{ type: 'text', text: task }],
        source: { kind: 'user' },
      }))
      await presentTurn(agent, firstEventIndex)
      await sessions.flush(agent.session)
    }
  } finally {
    readline.close()
    if (handle !== undefined) await handle.dispose()
    await ctx.fiber.dispose()
  }
}
