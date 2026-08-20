/**
 * Live slash-command discovery & tab completion for Avti Terminal.
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
  type AvtiTheme,
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
  { command: '/presentation', description: 'Run live interactive autonomous agent showcase', hint: '[scenario]', category: 'Showcase', source: 'avti' },
  { command: '/demo', description: 'Run fast-paced CLI performance & tool demonstration', category: 'Showcase', source: 'avti' },
  { command: '/models', description: 'List available model providers and catalog', hint: '[provider]', category: 'Model', source: 'avti' },
  { command: '/model', description: 'Show or switch active LLM route', hint: '[provider] <model>', category: 'Model', source: 'avti' },
  { command: '/theme', description: 'Show or switch terminal color theme', hint: '[name]', category: 'Theme', source: 'avti' },
  { command: '/sessions', description: 'Browse and switch saved project sessions', category: 'Session', source: 'avti' },
  { command: '/doctor', description: 'Check runtime health, workspace permissions & provider', category: 'Diagnostics', source: 'avti' },
  { command: '/exit', description: 'Exit Avti terminal session', category: 'Core', source: 'avti' },
] as const

/** Merge Avti commands with whatever the native Harness command registry exposes. */
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

/** Only show the menu while the first token is a slash-command prefix. */
export function filterAvtiCommandSuggestions(
  line: string,
  suggestions: readonly AvtiCommandSuggestion[],
  limit = 9,
): AvtiCommandSuggestion[] {
  const candidate = line.trimStart()
  if (!candidate.startsWith('/') || /\s/u.test(candidate)) return []
  const needle = candidate.toLowerCase()
  return suggestions
    .filter(suggestion => suggestion.command.toLowerCase().startsWith(needle))
    .slice(0, limit)
}

/** Native readline Tab completion, backed by the same catalog as the live menu. */
export function createAvtiSlashCompleter(
  getSuggestions: () => readonly AvtiCommandSuggestion[],
): (line: string) => [string[], string] {
  return line => {
    const candidate = line.trimStart()
    if (!candidate.startsWith('/') || /\s/u.test(candidate)) return [[], line]
    const matches = filterAvtiCommandSuggestions(candidate, getSuggestions(), Number.POSITIVE_INFINITY)
    return [matches.map(match => match.command), candidate]
  }
}

export interface AvtiSlashPaletteOptions {
  readonly readline: Interface
  readonly getSuggestions: () => readonly AvtiCommandSuggestion[]
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
