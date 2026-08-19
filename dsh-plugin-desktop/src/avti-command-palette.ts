/** Live slash-command discovery for Avti's readline-based terminal. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Interface } from 'node:readline/promises'

export interface AvtiCommandSuggestion {
  readonly command: string
  readonly description: string
  readonly hint?: string
  readonly source: 'avti' | 'harness'
}

/** Avti-owned commands. Harness/plugin commands are merged at runtime. */
export const AVTI_COMMAND_SUGGESTIONS: readonly AvtiCommandSuggestion[] = [
  { command: '/help', description: 'Show terminal commands', source: 'avti' },
  { command: '/status', description: 'Show project, model and session', source: 'avti' },
  { command: '/models', description: 'List available models', hint: '[provider]', source: 'avti' },
  { command: '/model', description: 'Show or change the active model', hint: '[provider] <model>', source: 'avti' },
  { command: '/sessions', description: 'Show recent project sessions', source: 'avti' },
  { command: '/theme', description: 'Show or change the terminal theme', hint: '[name]', source: 'avti' },
  { command: '/exit', description: 'Leave Avti', source: 'avti' },
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

const ESC = '\u001b['
const SAVE_CURSOR = `${ESC}s`
const RESTORE_CURSOR = `${ESC}u`
const MOVE_DOWN = `${ESC}1B`
const CLEAR_DOWN = `${ESC}J`
const DIM = `${ESC}2m`
const RESET = `${ESC}0m`

export interface AvtiSlashPaletteOptions {
  readonly readline: Interface
  readonly getSuggestions: () => readonly AvtiCommandSuggestion[]
  readonly input?: NodeJS.ReadStream
  readonly output?: NodeJS.WriteStream
}

function clearPalette(output: NodeJS.WriteStream): void {
  output.write(`${SAVE_CURSOR}${MOVE_DOWN}\r${CLEAR_DOWN}${RESTORE_CURSOR}`)
}

function renderPalette(options: AvtiSlashPaletteOptions): void {
  const output = options.output ?? process.stdout
  const input = options.input ?? process.stdin
  if (output.isTTY !== true || input.isTTY !== true) return

  const suggestions = filterAvtiCommandSuggestions(options.readline.line, options.getSuggestions())
  clearPalette(output)
  if (suggestions.length === 0) return

  const commandWidth = Math.max(...suggestions.map(suggestion => suggestion.command.length))
  const rows = suggestions.map(suggestion => {
    const command = suggestion.command.padEnd(commandWidth)
    const hint = suggestion.hint === undefined ? '' : ` ${suggestion.hint}`
    const source = suggestion.source === 'harness' ? ' · Harness' : ''
    return `  ${command}${hint}  ${DIM}${suggestion.description}${source}${RESET}`
  })

  output.write(`${SAVE_CURSOR}${MOVE_DOWN}\r${rows.join('\n')}\n${RESTORE_CURSOR}`)
}

/**
 * Ask for the main Avti task while showing live slash-command matches below the
 * current readline row. readline still owns editing/history; this layer only
 * paints disposable suggestions, so approvals/questions keep their native flow.
 */
export async function questionWithAvtiSlashPalette(
  options: AvtiSlashPaletteOptions,
  prompt: string,
): Promise<string> {
  const input = options.input ?? process.stdin
  const output = options.output ?? process.stdout
  let scheduled = false
  let active = true

  const scheduleRender = (): void => {
    if (!active || scheduled) return
    scheduled = true
    setImmediate(() => {
      scheduled = false
      if (active) renderPalette(options)
    })
  }

  if (input.isTTY === true && output.isTTY === true) input.on('keypress', scheduleRender)
  try {
    const answer = await options.readline.question(prompt)
    return answer
  } finally {
    active = false
    input.off('keypress', scheduleRender)
    if (output.isTTY === true) clearPalette(output)
  }
}
