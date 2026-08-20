/** Interactive Avti controls layered over the native Harness command registry. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent, ModelSelection, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-session-query'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { AVTI_COMMAND_SUGGESTIONS } from './avti-command-palette.ts'
import {
  AVTI_THEMES,
  resolveAvtiTheme,
  saveAvtiTheme,
  styleAvtiSelection,
  styleAvtiTone,
  type AvtiThemeRef,
  type AvtiTone,
} from './avti-theme.ts'

export interface AvtiSessionControlContext {
  readonly ctx: Context
  readonly agent: Agent
  readonly selection: ModelSelectionRef
  readonly defaultSelection: ModelSelection
  readonly saveSelection: (next: ModelSelection) => Promise<void>
  readonly theme: AvtiThemeRef
}

export type AvtiSessionControlResult = 'handled' | 'exit' | 'unhandled'

function styled(context: AvtiSessionControlContext, text: string, tone: AvtiTone): string {
  return styleAvtiTone(text, tone, context.theme.current)
}

function sectionTitle(context: AvtiSessionControlContext, title: string): string {
  return `${styled(context, '╭─', 'subtle')} ${styled(context, title, 'accent')}`
}

function sectionEnd(context: AvtiSessionControlContext, hint?: string): string {
  return hint === undefined
    ? styled(context, '╰─', 'subtle')
    : `${styled(context, '╰─', 'subtle')} ${styled(context, hint, 'muted')}`
}

function errorLine(context: AvtiSessionControlContext, message: string): string {
  return `  ${styled(context, '×', 'error')} ${styled(context, message, 'muted')}`
}

function successLine(context: AvtiSessionControlContext, message: string): string {
  return `  ${styled(context, '✓', 'success')} ${styled(context, message, 'text')}`
}

export function latestAvtiSessionSelection(events: readonly SessionEvent[]): ModelSelection | undefined {
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

export function currentAvtiSelection(context: AvtiSessionControlContext): ModelSelection {
  return context.selection.current
    ?? latestAvtiSessionSelection(context.agent.session.events)
    ?? context.defaultSelection
}

async function renderModels(context: AvtiSessionControlContext, providerFilter?: string): Promise<void> {
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    process.stdout.write(`\n${errorLine(context, 'Model registry is unavailable')}\n\n`)
    return
  }
  const selected = currentAvtiSelection(context)
  const providers = llm.listProviders().filter(provider => providerFilter === undefined || provider.id === providerFilter)
  if (providers.length === 0) {
    process.stdout.write(`\n${errorLine(context, `Provider not found: ${providerFilter ?? '(none)'}`)}\n\n`)
    return
  }

  process.stdout.write('\n')
  for (const provider of providers) {
    process.stdout.write(`${sectionTitle(context, `${provider.name} · ${provider.id}`)}\n`)
    try {
      const models = await llm.listModels(provider.id)
      if (models.length === 0) {
        process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, 'No catalog entries · custom ids may still work', 'muted')}\n`)
        process.stdout.write(`${sectionEnd(context)}\n`)
        continue
      }
      for (const model of models) {
        const active = selected.provider === provider.id && selected.model === model.id
        const label = `${model.name}  ${styled(context, `· ${model.id}`, 'muted')}`
        if (active) {
          process.stdout.write(`  ${styleAvtiSelection(`› ${model.name} · ${model.id}`, context.theme.current)}\n`)
        } else {
          process.stdout.write(`  ${styled(context, '│', 'subtle')} ${label}\n`)
        }
      }
    } catch (error: unknown) {
      process.stdout.write(`${errorLine(context, error instanceof Error ? error.message : String(error))}\n`)
    }
    process.stdout.write(`${sectionEnd(context)}\n`)
  }
  process.stdout.write('\n')
}

async function switchModel(context: AvtiSessionControlContext, args: readonly string[]): Promise<void> {
  const selected = currentAvtiSelection(context)
  if (args.length === 0) {
    process.stdout.write(`\n${sectionTitle(context, 'Model')}\n`)
    process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, `${selected.provider}/${selected.model}`, 'text')}\n`)
    process.stdout.write(`${sectionEnd(context, '/models to browse')}\n\n`)
    return
  }
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    process.stdout.write(`\n${errorLine(context, 'Model registry is unavailable')}\n\n`)
    return
  }

  const provider = args.length === 1 ? selected.provider : args[0]!
  const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
  try {
    const resolved = await llm.resolveModelInfo(provider, model)
    const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
    await context.saveSelection(next)
    context.selection.current = next
    process.stdout.write(`\n${successLine(context, `Model · ${resolved.name}`)}\n  ${styled(context, `${resolved.provider}/${resolved.id}`, 'muted')}\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n${errorLine(context, `Could not select model: ${error instanceof Error ? error.message : String(error)}`)}\n\n`)
  }
}

function switchTheme(context: AvtiSessionControlContext, requested?: string): void {
  if (requested === undefined || requested.trim() === '') {
    process.stdout.write(`\n${sectionTitle(context, 'Themes')}\n`)
    for (const theme of AVTI_THEMES) {
      const active = context.theme.current.id === theme.id
      const body = `${theme.id.padEnd(10)} ${theme.name} · ${theme.description}`
      if (active) process.stdout.write(`  ${styleAvtiSelection(`› ${body}`, context.theme.current)}\n`)
      else process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, body, 'muted')}\n`)
    }
    process.stdout.write(`${sectionEnd(context, '/theme <name>')}\n\n`)
    return
  }

  const candidate = resolveAvtiTheme(requested.trim())
  if (candidate === undefined) {
    process.stdout.write(`\n${errorLine(context, `Unknown theme: ${requested}`)}\n  ${styled(context, '/theme to see available themes', 'muted')}\n\n`)
    return
  }

  try {
    context.theme.current = saveAvtiTheme(candidate.id)
    process.stdout.write(`\n${successLine(context, `Theme · ${candidate.name}`)}\n  ${styled(context, candidate.description, 'muted')}\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n${errorLine(context, `Could not save theme: ${error instanceof Error ? error.message : String(error)}`)}\n\n`)
  }
}

async function renderSessions(context: AvtiSessionControlContext): Promise<void> {
  const query = context.ctx.get('sessionQuery')
  if (query === undefined) {
    process.stdout.write(`\n${errorLine(context, 'Session history is unavailable')}\n\n`)
    return
  }
  try {
    const records = (await query.listSessions())
      .filter(record => record.persisted && record.header.cwd === process.cwd())
      .slice(0, 10)
    process.stdout.write(`\n${sectionTitle(context, 'Recent sessions')}\n`)
    if (records.length === 0) process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, 'No saved sessions for this project', 'muted')}\n`)
    for (const record of records) {
      const active = record.header.id === context.agent.id
      const title = await query.readTitle(record.header.id).catch(() => undefined)
      const label = title?.title?.trim() || String(record.header.id)
      const body = `${label} · ${String(record.header.id)}`
      if (active) process.stdout.write(`  ${styleAvtiSelection(`› ${body}`, context.theme.current)}\n`)
      else process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, body, 'muted')}\n`)
    }
    process.stdout.write(`${sectionEnd(context, 'avti resume <session-id>')}\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n${errorLine(context, `Could not read sessions: ${error instanceof Error ? error.message : String(error)}`)}\n\n`)
  }
}

function renderHelp(context: AvtiSessionControlContext): void {
  process.stdout.write(`\n${sectionTitle(context, 'Avti commands')}\n`)
  for (const command of AVTI_COMMAND_SUGGESTIONS) {
    const input = command.hint === undefined ? '' : ` ${command.hint}`
    const commandText = `${command.command}${input}`.padEnd(28)
    process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, commandText, 'text')} ${styled(context, command.description, 'muted')}\n`)
  }
  process.stdout.write(`${sectionEnd(context)}\n`)

  const native = context.ctx.get('commands')?.list(context.agent) ?? []
  if (native.length > 0) {
    process.stdout.write(`${sectionTitle(context, 'Plugin commands')}\n`)
    for (const command of native) {
      const input = command.input?.hint === undefined ? '' : ` ${command.input.hint}`
      const commandText = `/${command.name}${input}`.padEnd(28)
      process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, commandText, 'text')} ${styled(context, command.description, 'muted')}\n`)
    }
    process.stdout.write(`${sectionEnd(context)}\n`)
  }
  process.stdout.write('\n')
}

async function executeNativeCommand(
  line: string,
  context: AvtiSessionControlContext,
): Promise<'handled' | 'unknown'> {
  const commands = context.ctx.get('commands')
  if (commands === undefined) return 'unknown'
  const controller = new AbortController()
  try {
    const execution = await commands.execute(context.agent, line, controller.signal)
    if (execution === undefined) return 'unknown'
    const text = execution.result.text
    if (text !== undefined && text !== '') {
      if (execution.result.kind === 'error') process.stdout.write(`\n${errorLine(context, text)}\n\n`)
      else process.stdout.write(`\n  ${styled(context, text, 'text')}\n\n`)
    }
    return 'handled'
  } catch (error: unknown) {
    process.stdout.write(`\n${errorLine(context, error instanceof Error ? error.message : String(error))}\n\n`)
    return 'handled'
  }
}

/** Handle Avti-owned commands first, then delegate every other slash command to Harness. */
export async function handleAvtiSessionControl(
  input: string,
  context: AvtiSessionControlContext,
): Promise<AvtiSessionControlResult> {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return 'unhandled'
  const [command = '', ...args] = trimmed.split(/\s+/u)

  switch (command.toLowerCase()) {
    case '/exit':
    case '/quit':
      return 'exit'
    case '/help':
      renderHelp(context)
      return 'handled'
    case '/status': {
      const selected = currentAvtiSelection(context)
      const rows: Array<readonly [string, string]> = [
        ['Project', process.cwd()],
        ['Provider', selected.provider],
        ['Model', selected.model],
        ...(selected.reasoningEffort === undefined ? [] : [['Reasoning', String(selected.reasoningEffort)] as const]),
        ['Theme', context.theme.current.id],
        ['Session', String(context.agent.id)],
        ['Permission', process.env.DSH_PERMISSION_MODE ?? 'workspace-write'],
      ]
      process.stdout.write(`\n${sectionTitle(context, 'Session')}\n`)
      for (const [label, value] of rows) {
        process.stdout.write(`  ${styled(context, '│', 'subtle')} ${styled(context, label.padEnd(11), 'muted')} ${styled(context, value, 'text')}\n`)
      }
      process.stdout.write(`${sectionEnd(context)}\n\n`)
      return 'handled'
    }
    case '/models':
      await renderModels(context, args[0])
      return 'handled'
    case '/model':
      await switchModel(context, args)
      return 'handled'
    case '/sessions':
      await renderSessions(context)
      return 'handled'
    case '/theme':
      switchTheme(context, args[0])
      return 'handled'
    default: {
      const native = await executeNativeCommand(trimmed, context)
      if (native === 'handled') return 'handled'
      process.stdout.write(`\n${errorLine(context, `Unknown command: ${command}`)}\n  ${styled(context, '/help to see available commands', 'muted')}\n\n`)
      return 'handled'
    }
  }
}
