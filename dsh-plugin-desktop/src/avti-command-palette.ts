/** Live slash-command discovery for Avti's terminal input. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Interface } from 'node:readline/promises'
import {
  loadAvtiTheme,
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
  { command: '/model', description: 'Show or change the active model', hint: '[provider] <model>', source: 'avti' },
  { command: '/models', description: 'List available models', hint: '[provider]', source: 'avti' },
  { command: '/theme', description: 'Show or change the terminal theme', hint: '[name]', source: 'avti' },
  { command: '/sessions', description: 'Show recent project sessions', source: 'avti' },
  { command: '/exit', description: 'Leave Avti', source: 'avti' },
] as const

export const AVTI_SLASH_ROOT_LIMIT = 5
export const AVTI_SLASH_FILTERED_LIMIT = 8
const AVTI_SLASH_MIN_COLUMNS = 28

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

function defaultSuggestionLimit(line: string): number {
  return line.trimStart() === '/' ? AVTI_SLASH_ROOT_LIMIT : AVTI_SLASH_FILTERED_LIMIT
}

export function filterAvtiCommandSuggestions(
  line: string,
  suggestions: readonly AvtiCommandSuggestion[],
  limit?: number,
): AvtiCommandSuggestion[] {
  const candidate = line.trimStart()
  if (!isSlashPrefix(line)) return []
  const needle = candidate.toLowerCase()
  return suggestions
    .filter(suggestion => suggestion.command.toLowerCase().startsWith(needle))
    .slice(0, limit ?? defaultSuggestionLimit(line))
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

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/gu, ' ').replace(/\s{2,}/gu, ' ').trim()
}

function fitText(value: string, width: number): string {
  if (width <= 0) return ''
  const normalized = oneLine(value)
  if (normalized.length <= width) return normalized
  if (width === 1) return '…'
  return `${normalized.slice(0, width - 1)}…`
}

export interface AvtiSlashPaletteRow {
  readonly selected: boolean
  readonly command: string
  readonly description: string
}

export interface AvtiSlashPaletteLayout {
  readonly rows: readonly AvtiSlashPaletteRow[]
  readonly footer: string
  readonly totalMatches: number
  readonly hiddenMatches: number
}

/**
 * Build a terminal-width-safe palette. Every returned display row is guaranteed
 * to fit on one physical terminal line, which makes exact cursor cleanup possible.
 */
export function layoutAvtiSlashPalette(
  line: string,
  suggestions: readonly AvtiCommandSuggestion[],
  state: AvtiSlashPaletteState,
  columns: number,
): AvtiSlashPaletteLayout {
  if (!isSlashPrefix(line) || state.dismissed || columns < AVTI_SLASH_MIN_COLUMNS) {
    return { rows: [], footer: '', totalMatches: 0, hiddenMatches: 0 }
  }

  const allMatches = filterAvtiCommandSuggestions(line, suggestions, Number.POSITIVE_INFINITY)
  const visibleMatches = allMatches.slice(0, defaultSuggestionLimit(line))
  const hiddenMatches = Math.max(0, allMatches.length - visibleMatches.length)
  if (visibleMatches.length === 0) {
    return { rows: [], footer: '', totalMatches: 0, hiddenMatches: 0 }
  }

  // Leave one spare terminal cell: writing exactly into the final column can cause
  // auto-wrap on terminals that eagerly advance at the right edge.
  const width = Math.max(1, columns - 1)
  const prefixWidth = 4 // two-space inset + selection marker + space
  const separatorWidth = 2
  const contentWidth = Math.max(1, width - prefixWidth)
  const commandValues = visibleMatches.map(suggestion => {
    const hint = suggestion.hint === undefined ? '' : ` ${oneLine(suggestion.hint)}`
    return oneLine(`${suggestion.command}${hint}`)
  })
  const longestCommand = Math.max(...commandValues.map(value => value.length))
  const maxCommandWidth = Math.max(10, Math.floor((contentWidth - separatorWidth) * 0.48))
  const commandWidth = Math.min(longestCommand, maxCommandWidth)
  const descriptionWidth = Math.max(0, contentWidth - commandWidth - separatorWidth)
  const selectedIndex = Math.min(state.selectedIndex, visibleMatches.length - 1)

  const rows = visibleMatches.map((suggestion, index) => ({
    selected: index === selectedIndex,
    command: fitText(commandValues[index]!, commandWidth).padEnd(commandWidth),
    description: fitText(
      suggestion.source === 'harness'
        ? `${suggestion.description} · plugin`
        : suggestion.description,
      descriptionWidth,
    ),
  }))

  const more = hiddenMatches > 0 ? ` · +${hiddenMatches} more` : ''
  const footer = fitText(`  ↑↓ select · tab complete · esc close${more}`, width)
  return { rows, footer, totalMatches: allMatches.length, hiddenMatches }
}

const ESC = '\u001b['
const ERASE_LINE = `${ESC}2K`
const HIDE_CURSOR = `${ESC}?25l`
const SHOW_CURSOR = `${ESC}?25h`

interface WritableReadline extends Interface {
  write(data: string | null, key?: { readonly ctrl?: boolean; readonly name?: string }): void
}

interface CursorAwareReadline extends Interface {
  getCursorPos?(): { readonly rows: number; readonly cols: number }
}

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

function currentReadlineLine(readline: Interface): string {
  const value = (readline as Interface & { readonly line?: unknown }).line
  return typeof value === 'string' ? value : ''
}

function currentCursorColumn(readline: Interface): number {
  try {
    return (readline as CursorAwareReadline).getCursorPos?.().cols ?? 0
  } catch {
    return 0
  }
}

function replaceReadlineLine(readline: Interface, next: string): void {
  const writable = readline as WritableReadline
  writable.write(null, { ctrl: true, name: 'a' })
  writable.write(null, { ctrl: true, name: 'k' })
  writable.write(next)
}

function moveVertical(rows: number): string {
  if (rows === 0) return ''
  return rows > 0 ? `${ESC}${rows}B` : `${ESC}${Math.abs(rows)}A`
}

function moveToColumn(column: number): string {
  return `${ESC}${Math.max(1, column + 1)}G`
}

/**
 * Paint/erase exactly the rows Avti owns below readline's input row. We never use
 * clear-to-end-of-screen, so dismissing the shelf cannot erase unrelated output.
 */
function paintPaletteRows(
  output: NodeJS.WriteStream,
  rows: readonly string[],
  previousRowCount: number,
  cursorColumn: number,
): number {
  if (output.isTTY !== true) return 0
  const rowCount = Math.max(rows.length, previousRowCount)
  if (rowCount === 0) return rows.length

  output.write(HIDE_CURSOR)
  for (let index = 0; index < rowCount; index += 1) {
    output.write(`${moveVertical(1)}\r${ERASE_LINE}`)
    if (index < rows.length) output.write(rows[index]!)
  }
  output.write(`${moveVertical(-rowCount)}${moveToColumn(cursorColumn)}${SHOW_CURSOR}`)
  return rows.length
}

function styledPaletteRows(
  layout: AvtiSlashPaletteLayout,
  theme: AvtiTheme,
  output: NodeJS.WriteStream,
): string[] {
  const rows = layout.rows.map(row => {
    const marker = styleAvtiTone(row.selected ? '›' : ' ', row.selected ? 'accentBright' : 'subtle', theme, output)
    const command = styleAvtiTone(row.command, row.selected ? 'accentBright' : 'text', theme, output)
    const description = row.description === '' ? '' : `  ${styleAvtiTone(row.description, 'muted', theme, output)}`
    return `  ${marker} ${command}${description}`
  })
  if (layout.footer !== '') rows.push(styleAvtiTone(layout.footer, 'subtle', theme, output))
  return rows
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
  let paintedRows = 0
  let state: AvtiSlashPaletteState = { dismissed: false, selectedIndex: 0 }
  let renderedLine = ''

  const clearPalette = (): void => {
    if (paintedRows === 0 || output.isTTY !== true) return
    paintedRows = paintPaletteRows(output, [], paintedRows, currentCursorColumn(options.readline))
  }

  const renderPalette = (): void => {
    if (output.isTTY !== true || input.isTTY !== true) return
    const line = currentReadlineLine(options.readline)
    const matches = filterAvtiCommandSuggestions(line, options.getSuggestions())
    state = nextAvtiSlashPaletteState(state, line, undefined, matches.length)
    const columns = output.columns ?? 80
    const layout = layoutAvtiSlashPalette(line, options.getSuggestions(), state, columns)
    const theme = options.getTheme?.() ?? loadAvtiTheme()
    const rows = styledPaletteRows(layout, theme, output)
    paintedRows = paintPaletteRows(output, rows, paintedRows, currentCursorColumn(options.readline))
  }

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
        renderPalette()
      } catch (cause) {
        active = false
        try { clearPalette() } catch { /* best-effort cleanup */ }
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
      try { clearPalette() } catch { /* logical dismissal is enough */ }
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
        state = { dismissed: true, selectedIndex: 0 }
        try { clearPalette() } catch { /* the next prompt render can recover */ }
        return
      }
    }

    // A real Enter moves readline onto the next physical row. Clear our transient
    // rows before readline handles it, while the cursor is still on the input line.
    if (keyName === 'return' || keyName === 'enter') {
      try { clearPalette() } catch { /* readline must still be allowed to submit */ }
      return
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
    try { clearPalette() } catch { /* never hide the prompt result/error */ }
    if (output.isTTY === true) output.write(SHOW_CURSOR)
  }
}
