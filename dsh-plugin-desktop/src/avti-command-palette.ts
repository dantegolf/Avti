/**
 * Live slash-command discovery & palette for Avti Terminal.
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Interface } from 'node:readline/promises'
import {
  AVTI_THEMES,
  BOLD,
  DIM,
  loadAvtiTheme,
  RESET,
  styleAvtiTone,
  type AvtiTheme,
  type AvtiTone,
} from './avti-theme.ts'

export type AvtiCommandCategory =
  | 'Core'
  | 'Model'
  | 'Theme'
  | 'Session'
  | 'Showcase'
  | 'Diagnostics'
  | 'Harness'

export interface AvtiCommandSuggestion {
  readonly command: string
  readonly description: string
  readonly hint?: string
  readonly category?: AvtiCommandCategory
  readonly source: 'avti' | 'harness'
}

/** Avti-owned commands with rich category tags and showcase modes. */
export const AVTI_COMMAND_SUGGESTIONS: readonly AvtiCommandSuggestion[] = [
  { command: '/help', description: 'Show terminal commands and keybindings', category: 'Core', source: 'avti' },
  { command: '/status', description: 'Show telemetry HUD, model, and session state', category: 'Core', source: 'avti' },
  { command: '/model', description: 'Show or switch active LLM route', hint: '[provider] <model>', category: 'Model', source: 'avti' },
  { command: '/models', description: 'List available model providers and catalog', hint: '[provider]', category: 'Model', source: 'avti' },
  { command: '/theme', description: 'Show or switch terminal color theme', hint: '[name]', category: 'Theme', source: 'avti' },
  { command: '/sessions', description: 'Browse and switch saved project sessions', category: 'Session', source: 'avti' },
  { command: '/presentation', description: 'Run live interactive autonomous agent showcase', hint: '[scenario]', category: 'Showcase', source: 'avti' },
  { command: '/demo', description: 'Run fast-paced CLI performance & tool demonstration', category: 'Showcase', source: 'avti' },
  { command: '/doctor', description: 'Check runtime health, workspace permissions & provider', category: 'Diagnostics', source: 'avti' },
  { command: '/exit', description: 'Exit Avti terminal session', category: 'Core', source: 'avti' },
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
      category: 'Harness',
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

  const width = Math.max(1, columns - 1)
  const prefixWidth = 4
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

export interface AvtiSlashPaletteOptions {
  readonly readline: Interface
  readonly getSuggestions: () => readonly AvtiCommandSuggestion[]
  readonly getTheme?: () => AvtiTheme
  readonly input?: NodeJS.ReadStream
  readonly output?: NodeJS.WriteStream
  readonly theme?: AvtiTheme
}

/**
 * Ask for the main Avti task with zero-flicker native readline input and tab autocompletion.
 */
export async function questionWithAvtiSlashPalette(
  options: AvtiSlashPaletteOptions,
  prompt: string,
): Promise<string> {
  return await options.readline.question(prompt)
}
