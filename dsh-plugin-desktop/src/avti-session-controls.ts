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
  type AvtiThemeRef,
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
    process.stdout.write('\n  × Model registry is unavailable\n\n')
    return
  }
  const selected = currentAvtiSelection(context)
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

async function switchModel(context: AvtiSessionControlContext, args: readonly string[]): Promise<void> {
  const selected = currentAvtiSelection(context)
  if (args.length === 0) {
    process.stdout.write(`\n  ${selected.provider} · ${selected.model}\n  Run /models to browse the registered catalog.\n\n`)
    return
  }
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    process.stdout.write('\n  × Model registry is unavailable\n\n')
    return
  }

  const provider = args.length === 1 ? selected.provider : args[0]!
  const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
  try {
    const resolved = await llm.resolveModelInfo(provider, model)
    const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
    // Persist first so the live session and Desktop/default state cannot silently diverge.
    await context.saveSelection(next)
    context.selection.current = next
    process.stdout.write(`\n  ✓ Model · ${resolved.name} (${resolved.provider}/${resolved.id})\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n  × Could not select model: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

function switchTheme(context: AvtiSessionControlContext, requested?: string): void {
  if (requested === undefined || requested.trim() === '') {
    process.stdout.write('\n  Themes\n')
    for (const theme of AVTI_THEMES) {
      const mark = context.theme.current.id === theme.id ? '›' : ' '
      process.stdout.write(`  ${mark} ${theme.id.padEnd(10)} ${theme.name} · ${theme.description}\n`)
    }
    process.stdout.write('\n  Change with: /theme <name>\n\n')
    return
  }

  const candidate = resolveAvtiTheme(requested.trim())
  if (candidate === undefined) {
    process.stdout.write(`\n  × Unknown theme: ${requested}\n  Run /theme to see available themes.\n\n`)
    return
  }

  try {
    context.theme.current = saveAvtiTheme(candidate.id)
    process.stdout.write(`\n  ✓ Theme · ${candidate.name} (${candidate.id})\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n  × Could not save theme: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

async function renderSessions(context: AvtiSessionControlContext): Promise<void> {
  const query = context.ctx.get('sessionQuery')
  if (query === undefined) {
    process.stdout.write('\n  × Session history is unavailable\n\n')
    return
  }
  try {
    const records = (await query.listSessions())
      .filter(record => record.persisted && record.header.cwd === process.cwd())
      .slice(0, 10)
    process.stdout.write('\n  Recent sessions\n')
    if (records.length === 0) process.stdout.write('  No saved sessions for this project.\n')
    for (const record of records) {
      const mark = record.header.id === context.agent.id ? '›' : ' '
      const title = await query.readTitle(record.header.id).catch(() => undefined)
      const label = title?.title?.trim() || String(record.header.id)
      process.stdout.write(`  ${mark} ${label} · ${String(record.header.id)}\n`)
    }
    process.stdout.write('\n  Resume from the shell with: avti resume <session-id>\n\n')
  } catch (error: unknown) {
    process.stdout.write(`\n  × Could not read sessions: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

function renderHelp(context: AvtiSessionControlContext): void {
  process.stdout.write('\n  Avti\n')
  for (const command of AVTI_COMMAND_SUGGESTIONS) {
    const input = command.hint === undefined ? '' : ` ${command.hint}`
    process.stdout.write(`  ${command.command}${input}  ${command.description}\n`)
  }

  const native = context.ctx.get('commands')?.list(context.agent) ?? []
  if (native.length > 0) {
    process.stdout.write('\n  Harness\n')
    for (const command of native) {
      const input = command.input?.hint === undefined ? '' : ` ${command.input.hint}`
      process.stdout.write(`  /${command.name}${input}  ${command.description}\n`)
    }
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
      const prefix = execution.result.kind === 'error' ? '  × ' : '  '
      process.stdout.write(`\n${prefix}${text}\n\n`)
    }
    return 'handled'
  } catch (error: unknown) {
    process.stdout.write(`\n  × ${error instanceof Error ? error.message : String(error)}\n\n`)
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
      process.stdout.write([
        '',
        `  Project    ${process.cwd()}`,
        `  Provider   ${selected.provider}`,
        `  Model      ${selected.model}`,
        ...(selected.reasoningEffort === undefined ? [] : [`  Reasoning  ${String(selected.reasoningEffort)}`]),
        `  Theme      ${context.theme.current.id}`,
        `  Session    ${String(context.agent.id)}`,
        `  Permission ${process.env.DSH_PERMISSION_MODE ?? 'workspace-write'}`,
        '',
      ].join('\n'))
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
      process.stdout.write(`\n  × Unknown command: ${command}\n  Run /help to see available commands.\n\n`)
      return 'handled'
    }
  }
}
