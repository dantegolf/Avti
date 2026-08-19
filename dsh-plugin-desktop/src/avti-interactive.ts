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
  AVTI_ORBIT_FRAMES,
  AVTI_PULSE_FRAMES,
  createAvtiActivity,
  formatAvtiFailure,
  formatAvtiSuccess,
  type AvtiActivity,
} from './avti-terminal-style.ts'
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
}

interface TurnPresentationState {
  streamedText: boolean
  endsWithNewline: boolean
  turnError?: string
  readonly tools: Map<string, AvtiToolPresentation>
}

interface InteractiveUi {
  readonly readline: Interface
  activity?: AvtiActivity
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

async function bootInteractiveProfile(): Promise<{ ctx: Context; shutdown: ProcessShutdown }> {
  const root = mkdtempSync(join(tmpdir(), 'avti-cli-'))
  const patchPath = join(root, 'interactive.patch.yml')
  writeFileSync(patchPath, INTERACTIVE_PATCH)
  try {
    const module = await import(PROFILE_BOOT_URL) as unknown as ProfileBootModule
    return await module.runProfile({
      environment: loadLayeredEnv('dsh'),
      profile: 'headless',
      patchFiles: [patchPath],
      args: [],
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function latestSessionSelection(events: readonly SessionEvent[]): ModelSelection | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event?.type !== 'request/header') continue
    const config = event.data.header.config
    return {
      provider: config.provider,
      model: config.model,
      ...(config.reasoningEffort === undefined ? {} : { reasoningEffort: config.reasoningEffort }),
    }
  }
  return undefined
}

function currentSelection(selection: ModelSelectionRef, agent: Agent, fallback: ModelSelection): ModelSelection {
  return selection.current ?? latestSessionSelection(agent.session.events) ?? fallback
}

async function renderInteractiveModels(ctx: Context, selected: ModelSelection, providerFilter?: string): Promise<void> {
  const llm = ctx.get('llm')
  if (llm === undefined) {
    process.stdout.write('\n  × Model registry is unavailable\n\n')
    return
  }
  const providers = llm.listProviders().filter(provider => providerFilter === undefined || provider.id === providerFilter)
  if (providers.length === 0) {
    process.stdout.write(`\n  × Provider not found: ${providerFilter ?? '(none)'}\n\n`)
    return
  }

  process.stdout.write('\n')
  for (const provider of providers) {
    process.stdout.write(`  ${provider.name} · ${provider.id}\n`)
    try {
      const models = await llm.listModels(provider.id)
      if (models.length === 0) {
        process.stdout.write('    · No catalog entries (custom model ids may still work)\n')
        continue
      }
      for (const model of models) {
        const mark = selected.provider === provider.id && selected.model === model.id ? '›' : ' '
        process.stdout.write(`    ${mark} ${model.name} · ${model.id}\n`)
      }
    } catch (error: unknown) {
      process.stdout.write(`    × ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
  process.stdout.write('\n')
}

async function handleInteractiveCommand(options: {
  readonly input: string
  readonly ctx: Context
  readonly agent: Agent
  readonly selection: ModelSelectionRef
  readonly defaultSelection: ModelSelection
  readonly saveSelection: (next: ModelSelection) => Promise<void>
}): Promise<'handled' | 'exit' | 'unhandled'> {
  const trimmed = options.input.trim()
  if (!trimmed.startsWith('/')) return 'unhandled'
  const [command = '', ...args] = trimmed.split(/\s+/u)
  const selected = currentSelection(options.selection, options.agent, options.defaultSelection)

  switch (command.toLowerCase()) {
    case '/exit':
    case '/quit':
      return 'exit'
    case '/help':
      process.stdout.write([
        '',
        '  /status                 show project, model and session',
        '  /models [provider]      list available models',
        '  /model                  show current model',
        '  /model <model>          switch model on current provider',
        '  /model <provider> <id>  switch provider and model',
        '  /sessions               show recent project sessions',
        '  /exit                   leave Avti',
        '',
      ].join('\n'))
      return 'handled'
    case '/status':
      process.stdout.write([
        '',
        `  Project    ${process.cwd()}`,
        `  Provider   ${selected.provider}`,
        `  Model      ${selected.model}`,
        ...(selected.reasoningEffort === undefined ? [] : [`  Reasoning  ${String(selected.reasoningEffort)}`]),
        `  Session    ${String(options.agent.id)}`,
        `  Permission ${process.env.DSH_PERMISSION_MODE ?? 'workspace-write'}`,
        '',
      ].join('\n'))
      return 'handled'
    case '/models':
      await renderInteractiveModels(options.ctx, selected, args[0])
      return 'handled'
    case '/model': {
      if (args.length === 0) {
        process.stdout.write(`\n  ${selected.provider} · ${selected.model}\n\n`)
        return 'handled'
      }
      const llm = options.ctx.get('llm')
      if (llm === undefined) {
        process.stdout.write('\n  × Model registry is unavailable\n\n')
        return 'handled'
      }
      const provider = args.length === 1 ? selected.provider : args[0]!
      const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
      try {
        const resolved = await llm.resolveModelInfo(provider, model)
        const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
        options.selection.current = next
        await options.saveSelection(next)
        process.stdout.write(`\n  ✓ Model · ${resolved.name} (${resolved.provider}/${resolved.id})\n\n`)
      } catch (error: unknown) {
        process.stdout.write(`\n  × Could not select model: ${error instanceof Error ? error.message : String(error)}\n\n`)
      }
      return 'handled'
    }
    case '/sessions': {
      const query = options.ctx.get('sessionQuery')
      if (query === undefined) {
        process.stdout.write('\n  × Session history is unavailable\n\n')
        return 'handled'
      }
      try {
        const records = (await query.listSessions())
          .filter(record => record.persisted && record.header.cwd === process.cwd())
          .slice(0, 10)
        process.stdout.write('\n  Recent sessions\n')
        if (records.length === 0) process.stdout.write('  No saved sessions for this project.\n')
        for (const record of records) {
          const mark = record.header.id === options.agent.id ? '›' : ' '
          process.stdout.write(`  ${mark} ${String(record.header.id)} · ${new Date(record.header.createdAt).toLocaleString()}\n`)
        }
        process.stdout.write('\n  Resume from the shell with: avti resume <session-id>\n\n')
      } catch (error: unknown) {
        process.stdout.write(`\n  × Could not read sessions: ${error instanceof Error ? error.message : String(error)}\n\n`)
      }
      return 'handled'
    }
    default:
      process.stdout.write(`\n  × Unknown command: ${command}\n  Run /help to see Avti commands.\n\n`)
      return 'handled'
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
  const restoredSelection = latestSessionSelection(snapshot.events) ?? options.defaultSelection
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

  const { ctx, shutdown } = await bootInteractiveProfile()
  let handle: AgentHandle | undefined
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
    historySize: 100,
  })
  const ui: InteractiveUi = { readline }

  try {
    await ctx.get('loader')?.await()
    const defaultModel = ctx.get('agentDefaultModel')
    const sessions = ctx.get('sessions')
    if (defaultModel === undefined || sessions === undefined) {
      throw new Error('Avti profile did not provide the required agent services')
    }

    const defaultSelection = defaultModel.currentSelection()
    const selected: ModelSelectionRef = { current: undefined, assembled: undefined }
    handle = await createOrResumeAgent({
      ctx,
      resumeSessionId: options.resumeSessionId,
      selection: selected,
      defaultSelection,
    })
    const agent = handle.agent
    installTerminalInteraction(ctx, agent, ui)
    await agent.whenIdle()

    const active = currentSelection(selected, agent, defaultSelection)
    process.stdout.write(`${process.cwd()} · ${active.model}${options.resumeSessionId === undefined ? '' : ' · resumed'}\n\n`)

    while (true) {
      let task: string
      try {
        task = await readline.question('› ')
      } catch {
        break
      }
      if (task.trim() === '') continue

      const commandResult = await handleInteractiveCommand({
        input: task,
        ctx,
        agent,
        selection: selected,
        defaultSelection,
        saveSelection: next => defaultModel.saveSelection(next),
      })
      if (commandResult === 'exit') break
      if (commandResult === 'handled') continue

      const firstEventIndex = agent.session.events.length
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
