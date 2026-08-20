/** Interactive Avti terminal frontend over the existing Harness headless composition. */

import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface, type Interface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import {
  installModelSelection,
  type Agent,
  type AgentHandle,
  type ModelSelection,
  type ModelSelectionRef,
} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/cordis-plugin-loader'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import { SessionId, type SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-query'
import type { ApprovalRequest } from '@deepseek-ai/dsh-user-approval'
import type {
  AskUserQuestionAnswer,
  AskUserQuestionItem,
  AskUserQuestionRequest,
} from '@deepseek-ai/dsh-user-questions'
import {
  createAvtiSlashCompleter,
  listAvtiCommandSuggestions,
  questionWithAvtiSlashPalette,
  type AvtiCommandSuggestion,
} from './avti-command-palette.ts'
import {
  AVTI_ORBIT_FRAMES,
  AVTI_PULSE_FRAMES,
  createAvtiActivity,
  formatAvtiFailure,
  formatAvtiSuccess,
  formatAvtiWelcome,
  type AvtiActivity,
} from './avti-terminal-style.ts'
import {
  currentAvtiSelection,
  handleAvtiSessionControl,
  latestAvtiSessionSelection,
  type AvtiSessionControlContext,
} from './avti-session-controls.ts'
import { formatAvtiPrompt, loadAvtiTheme, type AvtiThemeRef } from './avti-theme.ts'
import {
  avtiToolPresentation,
  type AvtiToolPresentation,
} from './avti-tool-presentation.ts'
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

interface ProcessShutdown {
  shutdown(code: number): Promise<void>
}

interface ProfileBootModule {
  runProfile(options: {
    environment: ReturnType<typeof loadLayeredEnv>
    profile: string
    patchFiles: readonly string[]
    args: readonly string[]
  }): Promise<{ ctx: Context; shutdown: ProcessShutdown }>
}

export interface AvtiInteractiveOptions {
  /** Persisted Harness session to continue instead of creating a fresh one. */
  readonly resumeSessionId?: string
  /** Generated Avti provider overlay shared by all CLI front doors. */
  readonly providerPatchPath?: string
}

interface TurnPresentationState {
  streamedText: boolean
  endsWithNewline: boolean
  turnError?: string
  readonly tools: Map<string, AvtiToolPresentation>
}

interface InteractiveUi {
  readonly readline: Interface
  activity: AvtiActivity | undefined
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

function prepareActivityLine(state: TurnPresentationState): void {
  if (state.streamedText && !state.endsWithNewline) {
    process.stdout.write('\n')
    state.endsWithNewline = true
  }
}

function showThinking(activity: AvtiActivity, state: TurnPresentationState): void {
  prepareActivityLine(state)
  activity.setFrames(AVTI_ORBIT_FRAMES)
  activity.update('Thinking')
  activity.start('Thinking')
}

function showToolActivity(
  activity: AvtiActivity,
  presentation: AvtiToolPresentation,
  state: TurnPresentationState,
): void {
  prepareActivityLine(state)
  activity.setFrames(AVTI_PULSE_FRAMES)
  activity.update(presentation.active)
  activity.start(presentation.active)
}

async function askTerminal(ui: InteractiveUi, prompt: string, signal?: AbortSignal): Promise<string> {
  ui.activity?.stop()
  try {
    return signal === undefined
      ? await ui.readline.question(prompt)
      : await ui.readline.question(prompt, { signal })
  } finally {
    if (signal?.aborted !== true) {
      ui.activity?.setFrames(AVTI_ORBIT_FRAMES)
      ui.activity?.start('Thinking')
    }
  }
}

function renderQuestion(question: AskUserQuestionItem): void {
  const heading = question.header ?? question.question
  process.stdout.write(`\n  ${heading}\n`)
  if (question.header !== undefined) process.stdout.write(`  ${question.question}\n`)
  if (question.detail !== undefined && question.detail !== '') {
    for (const line of question.detail.split('\n')) process.stdout.write(`    ${line}\n`)
  }
  for (const [index, option] of (question.options ?? []).entries()) {
    process.stdout.write(`  ${index + 1}. ${option.label}`)
    if (option.description !== undefined && option.description !== '') {
      process.stdout.write(` — ${option.description}`)
    }
    process.stdout.write('\n')
  }
}

function parseQuestionAnswer(question: AskUserQuestionItem, raw: string): AskUserQuestionAnswer['answers'][number] {
  const value = raw.trim()
  const options = question.options ?? []
  const requested = question.multiSelect === true
    ? value.split(',').map(part => part.trim()).filter(Boolean)
    : value === '' ? [] : [value]
  const selected: string[] = []
  const custom: string[] = []

  for (const token of requested) {
    const number = Number.parseInt(token, 10)
    if (String(number) === token && number >= 1 && number <= options.length) {
      const label = options[number - 1]?.label
      if (label !== undefined && !selected.includes(label)) selected.push(label)
      continue
    }
    const matching = options.find(option => option.label.toLowerCase() === token.toLowerCase())
    if (matching !== undefined) {
      if (!selected.includes(matching.label)) selected.push(matching.label)
    } else if (token !== '') {
      custom.push(token)
    }
  }

  return {
    id: question.id,
    selected,
    ...(custom.length > 0 ? { custom: custom.join(question.multiSelect === true ? ', ' : '') } : {}),
  }
}

async function answerUserQuestions(
  ui: InteractiveUi,
  request: AskUserQuestionRequest,
): Promise<AskUserQuestionAnswer> {
  const answers: AskUserQuestionAnswer['answers'] = []
  for (const question of request.questions) {
    renderQuestion(question)
    const options = question.options ?? []
    const hint = options.length === 0
      ? '› '
      : question.multiSelect === true
        ? '  Choose numbers (comma-separated) or type an answer: '
        : '  Choose a number or type an answer: '
    const raw = await askTerminal(ui, hint, request.signal)
    answers.push(parseQuestionAnswer(question, raw))
  }
  process.stdout.write('\n')
  return { answers }
}

async function answerApproval(ui: InteractiveUi, request: ApprovalRequest): Promise<'allowed-once' | 'rejected'> {
  process.stdout.write(`\n  Permission required · ${avtiToolPresentation(request.toolName).active}\n`)
  if (request.reason !== undefined && request.reason !== '') process.stdout.write(`  ${request.reason}\n`)
  const answer = (await askTerminal(ui, '  Allow once? [y/N] ', request.signal)).trim().toLowerCase()
  process.stdout.write('\n')
  return answer === 'y' || answer === 'yes' ? 'allowed-once' : 'rejected'
}

function installTerminalInteraction(ctx: Context, agent: Agent, ui: InteractiveUi): void {
  const questions = ctx.get('userQuestions')
  if (questions !== undefined) {
    questions.registerProvider({
      ask: request => answerUserQuestions(ui, request),
    })
  }

  // Agent-scoped listener: child agents keep Harness' fail-closed behavior rather
  // than inheriting a human prompt intended for the root terminal session.
  agent.ctx.on('approval/request', async (request: ApprovalRequest) => answerApproval(ui, request))
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
        showThinking(activity, state)
        return
      case 'tool-call-delta':
        if (chunk.name !== undefined && chunk.name !== '') {
          showToolActivity(activity, avtiToolPresentation(chunk.name), state)
        }
        return
      case 'block-start':
        if (chunk.blockType === 'reasoning') showThinking(activity, state)
        return
      case 'block-end':
      case 'usage':
      case 'finish':
        return
    }
  }

  if (event.type === 'tool/call') {
    const callId = String(event.data.callId)
    const presentation = avtiToolPresentation(event.data.name)
    state.tools.set(callId, presentation)
    showToolActivity(activity, presentation, state)
    return
  }

  if (event.type === 'tool/result') {
    prepareActivityLine(state)
    const callId = String(event.data.message.source.callId)
    const presentation = state.tools.get(callId)
    if (presentation !== undefined) {
      activity.stop()
      const completion = event.data.error === undefined
        ? formatAvtiSuccess(presentation.success)
        : formatAvtiFailure(presentation.failure)
      process.stdout.write(`${completion}\n`)
      state.tools.delete(callId)
      state.endsWithNewline = true

      const remaining = state.tools.values().next().value as AvtiToolPresentation | undefined
      if (remaining !== undefined) showToolActivity(activity, remaining, state)
    }
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

async function presentTurn(agent: Agent, firstEventIndex: number, ui: InteractiveUi): Promise<void> {
  const activity = createAvtiActivity({ frames: AVTI_ORBIT_FRAMES })
  ui.activity = activity
  const state: TurnPresentationState = {
    streamedText: false,
    endsWithNewline: false,
    tools: new Map(),
  }
  let eventIndex = firstEventIndex
  let settled = false
  const idle = agent.whenIdle().finally(() => { settled = true })

  showThinking(activity, state)

  const drain = (): void => {
    const events = agent.session.events
    while (eventIndex < events.length) {
      const event = events[eventIndex]
      eventIndex += 1
      if (event !== undefined) renderSessionEvent(event, activity, state)
    }
  }

  try {
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
  } finally {
    activity.stop()
    if (ui.activity === activity) ui.activity = undefined
  }
}

async function bootInteractiveProfile(providerPatchPath?: string): Promise<{ ctx: Context; shutdown: ProcessShutdown }> {
  const root = mkdtempSync(join(tmpdir(), 'avti-cli-'))
  const patchPath = join(root, 'interactive.patch.yml')
  writeFileSync(patchPath, INTERACTIVE_PATCH)
  try {
    const module = await import(PROFILE_BOOT_URL) as unknown as ProfileBootModule
    return await module.runProfile({
      environment: loadLayeredEnv('dsh'),
      profile: 'headless',
      patchFiles: [patchPath, ...(providerPatchPath === undefined ? [] : [providerPatchPath])],
      args: [],
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

async function createOrResumeAgent(options: {
  readonly ctx: Context
  readonly resumeSessionId?: string
  readonly selection: ModelSelectionRef
  readonly defaultSelection: ModelSelection
}): Promise<AgentHandle> {
  const agents = options.ctx.get('agents')
  if (agents === undefined) throw new Error('Avti profile did not provide the agent registry')
  const setup = (agentCtx: Context): void => { installModelSelection(agentCtx, options.selection) }

  if (options.resumeSessionId === undefined) {
    options.selection.current = options.defaultSelection
    return agents.create({
      sessionId: SessionId(`avti-${randomUUID()}`),
      meta: { cwd: process.cwd() },
      agentOptions: {
        provider: options.defaultSelection.provider,
        model: options.defaultSelection.model,
      },
      setup,
    })
  }

  const id = SessionId(options.resumeSessionId)
  const query = options.ctx.get('sessionQuery')
  if (query === undefined) throw new Error('session history is unavailable')
  const record = (await query.listSessions()).find(candidate => candidate.header.id === id)
  if (record === undefined || !record.persisted) throw new Error(`saved session not found: ${options.resumeSessionId}`)
  if (record.header.cwd !== process.cwd()) {
    throw new Error(`session belongs to ${record.header.cwd ?? '(no project)'}; cd to that project before resuming`)
  }

  const snapshot = await query.readSession(id)
  const restoredSelection = latestAvtiSessionSelection(snapshot.events) ?? options.defaultSelection
  options.selection.current = restoredSelection
  return agents.resume({
    resumeSessionId: id,
    agentOptions: { provider: restoredSelection.provider, model: restoredSelection.model },
    setup,
  })
}

/** Run one persistent Harness Agent behind Avti's minimalist terminal frontend. */
export async function runAvtiInteractive(options: AvtiInteractiveOptions = {}): Promise<void> {
  if (process.stdin.isTTY !== true || process.stdout.isTTY !== true) {
    throw new Error('interactive mode requires a terminal; pass a task as an argument for one-shot mode')
  }

  const { ctx, shutdown } = await bootInteractiveProfile(options.providerPatchPath)
  let handle: AgentHandle | undefined
  let commandSuggestions: () => readonly AvtiCommandSuggestion[] = () => []
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 100,
    completer: createAvtiSlashCompleter(() => commandSuggestions()),
  })
  const ui: InteractiveUi = { readline, activity: undefined }

  try {
    await ctx.get('loader')?.await()
    const defaultModel = ctx.get('agentDefaultModel')
    const sessions = ctx.get('sessions')
    if (defaultModel === undefined || sessions === undefined) {
      throw new Error('Avti profile did not provide the required agent services')
    }

    const defaultSelection = defaultModel.currentSelection()
    const selected: ModelSelectionRef = { current: undefined, assembled: undefined }
    const theme: AvtiThemeRef = { current: loadAvtiTheme() }
    handle = await createOrResumeAgent({
      ctx,
      ...(options.resumeSessionId === undefined ? {} : { resumeSessionId: options.resumeSessionId }),
      selection: selected,
      defaultSelection,
    })
    const agent = handle.agent
    commandSuggestions = () => listAvtiCommandSuggestions(ctx, agent)
    installTerminalInteraction(ctx, agent, ui)
    await agent.whenIdle()

    const controls: AvtiSessionControlContext = {
      ctx,
      agent,
      selection: selected,
      defaultSelection,
      saveSelection: next => defaultModel.saveSelection(next),
      theme,
    }
    const active = currentAvtiSelection(controls)
    process.stdout.write(formatAvtiWelcome(theme.current, {
      project: process.cwd(),
      provider: active.provider,
      model: active.model,
      resumed: options.resumeSessionId !== undefined,
    }, process.stdout))

    while (true) {
      let task: string
      try {
        task = await questionWithAvtiSlashPalette({
          readline,
          getSuggestions: commandSuggestions,
        }, formatAvtiPrompt(theme.current))
      } catch {
        break
      }
      if (task.trim() === '') continue

      const firstEventIndex = agent.session.events.length
      const commandResult = await handleAvtiSessionControl(task, controls)
      if (commandResult === 'exit') break
      if (commandResult === 'handled') {
        const openedTurn = agent.session.events
          .slice(firstEventIndex)
          .some(event => event.type === 'turn/start')
        if (openedTurn || agent.status === 'running') {
          await presentTurn(agent, firstEventIndex, ui)
        }
        await sessions.flush(agent.session)
        continue
      }

      agent.followup(createUserMessage({
        content: [{ type: 'text', text: task }],
        source: { kind: 'user' },
      }))
      await presentTurn(agent, firstEventIndex, ui)
      await sessions.flush(agent.session)
    }
  } finally {
    ui.activity?.stop()
    readline.close()
    if (handle !== undefined) await handle.dispose()
    await shutdown.shutdown(0)
  }
}
