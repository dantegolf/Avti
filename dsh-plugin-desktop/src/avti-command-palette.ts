/** Live slash-command discovery for Avti's terminal input. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Interface } from 'node:readline/promises'
import {
  loadAvtiTheme,
  styleAvtiSelection,
  styleAvtiTone,
  type AvtiTheme,
} from './avti-theme.ts'

export interface AvtiCommandSuggestion {
  readonly command: string
  readonly description: string
  readonly hint?: string
  readonly source: 'avti' | 'harness'
}

export const AVTI_COMMAND_SUGGESTIONS: readonly AvtiCommandSuggestion[] = [
  { command: '/help', description: 'Show terminal commands', source: 'avti' },
  { command: '/status', description: 'Show project, model and session', source: 'avti' },
  { command: '/models', description: 'List available models', hint: '[provider]', source: 'avti' },
  { command: '/model', description: 'Show or change the active model', hint: '[provider] <model>', source: 'avti' },
  { command: '/sessions', description: 'Show recent project sessions', source: 'avti' },
  { command: '/theme', description: 'Show or change the terminal theme', hint: '[name]', source: 'avti' },
  { command: '/exit', description: 'Leave Avti', source: 'avti' },
] as const

const AVTI_SLASH_PALETTE_LIMIT = 6

export function listAvtiCommandSuggestions(ctx: Context, agent: Agent): AvtiCommandSuggestion[] {
  const merged = new Map<string, AvtiCommandSuggestion>()
  for (const suggestion of AVTI_COMMAND_SUGGESTIONS) merged.set(suggestion.command, suggestion)

  for (const command of ctx.get('commands')?.list(agent) ?? []) {
    const name = `/${command.name}`
    if (merged.has(name)) continue
    merged.set(name, {
      command: name,
      description: command.description,
      ...(command.input?.hint === undefined ? {} : { hint: command.input.hint }),
      source: 'harness',
    })
  }

  return [...merged.values()]
}

function isSlashPrefix(line: string): boolean {
  const candidate = line.trimStart()
  return candidate.startsWith('/') && !/\s/u.test(candidate)
}

export function filterAvtiCommandSuggestions(
  line: string,
  suggestions: readonly AvtiCommandSuggestion[],
  limit = AVTI_SLASH_PALETTE_LIMIT,
): AvtiCommandSuggestion[] {
  const candidate = line.trimStart()
  if (!isSlashPrefix(line)) return []
  const needle = candidate.toLowerCase()
  return suggestions
    .filter(suggestion => suggestion.command.toLowerCase().startsWith(needle))
    .slice(0, limit)
}

export function createAvtiSlashCompleter(
  getSuggestions: () => readonly AvtiCommandSuggestion[],
): (line: string) => [string[], string] {
  return line => {
    const candidate = line.trimStart()
    if (!isSlashPrefix(line)) return [[], line]
    const matches = filterAvtiCommandSuggestions(candidate, getSuggestions(), Number.POSITIVE_INFINITY)
    return [matches.map(match => match.command), candidate]
  }
}

export interface AvtiSlashPaletteState {
  readonly dismissed: boolean
  readonly selectedIndex: number
}

export function nextAvtiSlashPaletteState(
  state: AvtiSlashPaletteState,
  line: string,
  keyName: string | undefined,
  matchCount: number,
): AvtiSlashPaletteState {
  if (!isSlashPrefix(line)) return { dismissed: false, selectedIndex: 0 }
  if (keyName === 'escape') return { dismissed: true, selectedIndex: state.selectedIndex }
  if (state.dismissed) return state
  if (matchCount <= 0) return { dismissed: false, selectedIndex: 0 }
  if (keyName === 'down') return { dismissed: false, selectedIndex: (state.selectedIndex + 1) % matchCount }
  if (keyName === 'up') return { dismissed: false, selectedIndex: (state.selectedIndex - 1 + matchCount) % matchCount }
  return { dismissed: false, selectedIndex: Math.min(state.selectedIndex, matchCount - 1) }
}

const ESC = '\u001b['
const SAVE_CURSOR = `${ESC}s`
const RESTORE_CURSOR = `${ESC}u`
const MOVE_DOWN = `${ESC}1B`
const CLEAR_DOWN = `${ESC}J`

interface MutableKeypress {
  name?: string
  sequence?: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
}

export interface AvtiSlashPaletteOptions {
  readonly readline: Interface
  readonly getSuggestions: () => readonly AvtiCommandSuggestion[]
  readonly getTheme?: () => AvtiTheme
  readonly input?: NodeJS.ReadStream
  readonly output?: NodeJS.WriteStream
}

function clearPalette(output: NodeJS.WriteStream): void {
  output.write(`${SAVE_CURSOR}${MOVE_DOWN}\r${CLEAR_DOWN}${RESTORE_CURSOR}`)
}

function currentReadlineLine(readline: Interface): string {
  const value = (readline as Interface & { readonly line?: unknown }).line
  return typeof value === 'string' ? value : ''
}

function replaceReadlineLine(readline: Interface, next: string): void {
  readline.write(null, { ctrl: true, name: 'a' })
  readline.write(null, { ctrl: true, name: 'k' })
  readline.write(next)
}

function renderPalette(
  options: AvtiSlashPaletteOptions,
  state: AvtiSlashPaletteState,
): AvtiSlashPaletteState {
  const output = options.output ?? process.stdout
  const input = options.input ?? process.stdin
  if (output.isTTY !== true || input.isTTY !== true) return state

  const line = currentReadlineLine(options.readline)
  const matches = filterAvtiCommandSuggestions(line, options.getSuggestions())
  const nextState = nextAvtiSlashPaletteState(state, line, undefined, matches.length)
  clearPalette(output)
  if (nextState.dismissed || matches.length === 0) return nextState

  const theme = options.getTheme?.() ?? loadAvtiTheme()
  const commandWidth = Math.max(...matches.map(suggestion => suggestion.command.length + (suggestion.hint?.length ?? 0) + 1))
  const header = `  ${styleAvtiTone('╭─', 'subtle', theme, output)} ${styleAvtiTone('commands', 'accent', theme, output)}`
  const rows = matches.map((suggestion, index) => {
    const hint = suggestion.hint === undefined ? '' : ` ${suggestion.hint}`
    const command = `${suggestion.command}${hint}`.padEnd(commandWidth)
    const source = suggestion.source === 'harness' ? ' · plugin' : ''
    const body = `${index === nextState.selectedIndex ? '›' : ' '} ${command}  ${suggestion.description}${source}`
    if (index === nextState.selectedIndex) return `  ${styleAvtiSelection(body, theme, output)}`
    return `  ${styleAvtiTone('│', 'subtle', theme, output)} ${styleAvtiTone(command, 'text', theme, output)}  ${styleAvtiTone(`${suggestion.description}${source}`, 'muted', theme, output)}`
  })
  const footer = `  ${styleAvtiTone('╰─', 'subtle', theme, output)} ${styleAvtiTone('↑↓ move  ↵ select  tab complete  esc close', 'muted', theme, output)}`

  output.write(`${SAVE_CURSOR}${MOVE_DOWN}\r${[header, ...rows, footer].join('\n')}\n${RESTORE_CURSOR}`)
  return nextState
}

function formatPromptFailure(cause: unknown): string {
  return cause instanceof Error ? cause.stack ?? cause.message : String(cause)
}

export async function questionWithAvtiSlashPalette(
  options: AvtiSlashPaletteOptions,
  prompt: string,
): Promise<string> {
  const input = options.input ?? process.stdin
  const output = options.output ?? process.stdout
  let scheduled = false
  let active = true
  let keypressAttached = false
  let state: AvtiSlashPaletteState = { dismissed: false, selectedIndex: 0 }
  let renderedLine = ''

  const scheduleRender = (): void => {
    if (!active || scheduled) return
    scheduled = true
    setImmediate(() => {
      scheduled = false
      if (!active) return
      try {
        const line = currentReadlineLine(options.readline)
        if (line !== renderedLine && !isSlashPrefix(line)) state = { dismissed: false, selectedIndex: 0 }
        renderedLine = line
        state = renderPalette(options, state)
      } catch (cause) {
        active = false
        process.stderr.write(`avti: command shelf failed: ${formatPromptFailure(cause)}\n`)
      }
    })
  }

  const suppressReadlineKey = (key: MutableKeypress): void => {
    key.name = 'avti-palette'
    key.sequence = ''
    key.ctrl = false
    key.meta = false
  }

  const onKeypress = (_character: string | undefined, key?: MutableKeypress): void => {
    if (!active) return
    const keyName = key?.name
    const line = currentReadlineLine(options.readline)
    const matches = filterAvtiCommandSuggestions(line, options.getSuggestions())

    if (keyName === 'escape' && isSlashPrefix(line)) {
      state = nextAvtiSlashPaletteState(state, line, keyName, matches.length)
      if (key !== undefined) suppressReadlineKey(key)
      try { clearPalette(output) } catch { /* logical dismissal is enough */ }
      return
    }

    if (!state.dismissed && matches.length > 0 && (keyName === 'up' || keyName === 'down')) {
      state = nextAvtiSlashPaletteState(state, line, keyName, matches.length)
      if (key !== undefined) suppressReadlineKey(key)
      scheduleRender()
      return
    }

    if (!state.dismissed && matches.length > 0 && (keyName === 'tab' || keyName === 'return' || keyName === 'enter')) {
      const selected = matches[Math.min(state.selectedIndex, matches.length - 1)]!
      const candidate = line.trimStart()
      const exact = candidate === selected.command
      const completeSelected = keyName === 'tab' || !exact
      if (completeSelected) {
        const accepted = selected.hint === undefined ? selected.command : `${selected.command} `
        replaceReadlineLine(options.readline, accepted)
        if (key !== undefined) suppressReadlineKey(key)
        state = { dismissed: selected.hint !== undefined, selectedIndex: 0 }
        scheduleRender()
        return
      }
    }

    scheduleRender()
  }

  if (input.isTTY === true && output.isTTY === true) {
    try {
      input.prependListener('keypress', onKeypress)
      keypressAttached = true
    } catch (cause) {
      process.stderr.write(`avti: command shelf disabled: ${formatPromptFailure(cause)}\n`)
    }
  }

  try {
    return await options.readline.question(prompt)
  } catch (cause) {
    process.stderr.write(`avti: interactive prompt failed: ${formatPromptFailure(cause)}\n`)
    throw cause
  } finally {
    active = false
    if (keypressAttached) input.off('keypress', onKeypress)
    if (output.isTTY === true) {
      try { clearPalette(output) } catch { /* never hide the prompt result/error */ }
    }
  }
}
