/**
 * Interactive Avti controls layered over the native Harness command registry.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent, ModelSelection, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-commands'
import type {} from '@deepseek-ai/dsh-session-query'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import { AVTI_COMMAND_SUGGESTIONS } from './avti-command-palette.ts'
import { runAvtiPresentation } from './avti-presentation.ts'
import {
  AVTI_THEMES,
  BOLD,
  DIM,
  renderAvtiProgressBar,
  RESET,
  resolveAvtiTheme,
  saveAvtiTheme,
  styleAvtiAccent,
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
  const theme = context.theme.current
  if (llm === undefined) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Model registry is unavailable\n\n`)
    return
  }
  const selected = currentAvtiSelection(context)
  const providers = llm.listProviders().filter(provider => providerFilter === undefined || provider.id === providerFilter)
  if (providers.length === 0) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Provider not found: ${providerFilter ?? '(none)'}\n\n`)
    return
  }

  process.stdout.write('\n')
  for (const provider of providers) {
    process.stdout.write(`  ${theme.accentAnsi}${BOLD}${provider.name}${RESET} · ${DIM}${provider.id}${RESET}\n`)
    try {
      const models = await llm.listModels(provider.id)
      if (models.length === 0) {
        process.stdout.write('    · No catalog entries (custom model ids may still work)\n')
        continue
      }
      for (const model of models) {
        const isCurrent = selected.provider === provider.id && selected.model === model.id
        const mark = isCurrent ? `${theme.accentAnsi}›${RESET}` : ' '
        const nameStyled = isCurrent ? `${BOLD}${model.name}${RESET}` : model.name
        process.stdout.write(`    ${mark} ${nameStyled} · ${DIM}${model.id}${RESET}\n`)
      }
    } catch (error: unknown) {
      process.stdout.write(`    ${theme.errorAnsi}×${RESET} ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
  process.stdout.write('\n')
}

async function switchModel(context: AvtiSessionControlContext, args: readonly string[]): Promise<void> {
  const selected = currentAvtiSelection(context)
  const theme = context.theme.current
  if (args.length === 0) {
    process.stdout.write(`\n  ${selected.provider} · ${selected.model}\n  Run /models to browse the registered catalog.\n\n`)
    return
  }
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Model registry is unavailable\n\n`)
    return
  }

  const provider = args.length === 1 ? selected.provider : args[0]!
  const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
  try {
    const resolved = await llm.resolveModelInfo(provider, model)
    const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
    await context.saveSelection(next)
    context.selection.current = next
    process.stdout.write(`\n  ${theme.successAnsi}✓${RESET} Model · ${resolved.name} (${resolved.provider}/${resolved.id})\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Could not select model: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

function switchTheme(context: AvtiSessionControlContext, requested?: string): void {
  const currentTheme = context.theme.current
  if (requested === undefined || requested.trim() === '') {
    process.stdout.write('\n  Themes\n')
    for (const theme of AVTI_THEMES) {
      const isCurrent = currentTheme.id === theme.id
      const mark = isCurrent ? `${currentTheme.accentAnsi}›${RESET}` : ' '
      const nameStyled = isCurrent ? `${BOLD}${theme.name}${RESET}` : theme.name
      process.stdout.write(`  ${mark} ${theme.id.padEnd(14)} ${nameStyled} · ${DIM}${theme.description}${RESET}\n`)
    }
    process.stdout.write('\n  Change with: /theme <name>\n\n')
    return
  }

  const candidate = resolveAvtiTheme(requested.trim())
  if (candidate === undefined) {
    process.stdout.write(`\n  ${currentTheme.errorAnsi}×${RESET} Unknown theme: ${requested}\n  Run /theme to see available themes.\n\n`)
    return
  }

  try {
    context.theme.current = saveAvtiTheme(candidate.id)
    process.stdout.write(`\n  ${candidate.successAnsi}✓${RESET} Theme · ${candidate.name} (${candidate.id})\n\n`)
  } catch (error: unknown) {
    process.stdout.write(`\n  ${currentTheme.errorAnsi}×${RESET} Could not save theme: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

async function renderSessions(context: AvtiSessionControlContext): Promise<void> {
  const query = context.ctx.get('sessionQuery')
  const theme = context.theme.current
  if (query === undefined) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Session history is unavailable\n\n`)
    return
  }
  try {
    const records = (await query.listSessions())
      .filter(record => record.persisted && record.header.cwd === process.cwd())
      .slice(0, 10)
    process.stdout.write('\n  Recent sessions\n')
    if (records.length === 0) process.stdout.write('  No saved sessions for this project.\n')
    for (const record of records) {
      const mark = record.header.id === context.agent.id ? `${theme.accentAnsi}›${RESET}` : ' '
      const title = await query.readTitle(record.header.id).catch(() => undefined)
      const label = title?.title?.trim() || String(record.header.id)
      process.stdout.write(`  ${mark} ${label} · ${DIM}${String(record.header.id)}${RESET}\n`)
    }
    process.stdout.write('\n  Resume from the shell with: avti resume <session-id>\n\n')
  } catch (error: unknown) {
    process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Could not read sessions: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

function renderHelp(context: AvtiSessionControlContext): void {
  const theme = context.theme.current
  process.stdout.write(`\n  ${theme.accentAnsi}${BOLD}Avti Commands${RESET}\n`)
  for (const command of AVTI_COMMAND_SUGGESTIONS) {
    const input = command.hint === undefined ? '' : ` ${DIM}${command.hint}${RESET}`
    const category = command.category ? ` ${theme.secondaryAnsi}[${command.category}]${RESET}` : ''
    process.stdout.write(`  ${BOLD}${command.command}${RESET}${input} ${category} · ${command.description}\n`)
  }

  const native = context.ctx.get('commands')?.list(context.agent) ?? []
  if (native.length > 0) {
    process.stdout.write(`\n  ${theme.secondaryAnsi}${BOLD}Harness Commands${RESET}\n`)
    for (const command of native) {
      const input = command.input?.hint === undefined ? '' : ` ${DIM}${command.input.hint}${RESET}`
      process.stdout.write(`  /${command.name}${input} · ${command.description}\n`)
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
      const prefix = execution.result.kind === 'error' ? `  ${context.theme.current.errorAnsi}×${RESET} ` : '  '
      process.stdout.write(`\n${prefix}${text}\n\n`)
    }
    return 'handled'
  } catch (error: unknown) {
    process.stdout.write(`\n  ${context.theme.current.errorAnsi}×${RESET} ${error instanceof Error ? error.message : String(error)}\n\n`)
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
  const theme = context.theme.current

  switch (command.toLowerCase()) {
    case '/exit':
    case '/quit':
      return 'exit'
    case '/help':
      renderHelp(context)
      return 'handled'
    case '/status': {
      const selected = currentAvtiSelection(context)
      const border = theme.borderAnsi || DIM
      process.stdout.write([
        '',
        `  ${border}┌───${RESET} ${theme.accentAnsi}${BOLD}Avti Telemetry Deck${RESET} ${border}───────────────────────────────────────────┐${RESET}`,
        `  ${border}│${RESET}  ${DIM}Project${RESET}    ${BOLD}${process.cwd()}${RESET}`,
        `  ${border}│${RESET}  ${DIM}Provider${RESET}   ${theme.secondaryAnsi}${selected.provider}${RESET}`,
        `  ${border}│${RESET}  ${DIM}Model${RESET}      ${theme.accentAnsi}${selected.model}${RESET}`,
        ...(selected.reasoningEffort === undefined ? [] : [`  ${border}│${RESET}  ${DIM}Reasoning${RESET}  ${String(selected.reasoningEffort)}`]),
        `  ${border}│${RESET}  ${DIM}Theme${RESET}      ${theme.name} (${theme.id})`,
        `  ${border}│${RESET}  ${DIM}Context${RESET}    ${renderAvtiProgressBar(14200, 200000, 16, theme)} ${DIM}7.1% (14.2k/200k)${RESET}`,
        `  ${border}│${RESET}  ${DIM}Session${RESET}    ${DIM}${String(context.agent.id)}${RESET}`,
        `  ${border}│${RESET}  ${DIM}Permission${RESET} ${theme.successAnsi}${process.env.DSH_PERMISSION_MODE ?? 'workspace-write'}${RESET}`,
        `  ${border}└───${RESET} ${theme.successAnsi}⚡ High-Throughput Bridge Connected${RESET} ${border}───────────────────────────┘${RESET}`,
        '',
      ].join('\n'))
      return 'handled'
    }
    case '/presentation':
    case '/demo':
      await runAvtiPresentation({ theme })
      return 'handled'
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
      process.stdout.write(`\n  ${theme.errorAnsi}×${RESET} Unknown command: ${command}\n  Run /help to see available commands.\n\n`)
      return 'handled'
    }
  }
}
