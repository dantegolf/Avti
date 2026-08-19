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

const AVTI_SLASH_PALETTE_LIMIT = 7

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

function isSlashPrefix(line: string): boolean {
  const candidate = line.trimStart()
  return candidate.startsWith('/') && !/\s/u.test(candidate)
}

/** Only show the menu while the first token is a slash-command prefix. */
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

/** Native readline Tab completion, backed by the same catalog as the live menu. */
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

export interface AvtiSlashPaletteVisibility {
  readonly dismissed: boolean
}

/**
 * Keep Escape dismissal sticky for the current slash token. Once the user
 * leaves slash-command mode (empty/normal text/arguments), the next `/` can
 * open discovery again.
 */
export function nextAvtiSlashPaletteVisibility(
  state: AvtiSlashPaletteVisibility,
  line: string,
  keyName?: string,
): AvtiSlashPaletteVisibility {
  if (!isSlashPrefix(line)) return { dismissed: false }
  if (keyName === 'escape') return { dismissed: true }
  return state
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

function currentReadlineLine(readline: Interface): string {
  const value = (readline as Interface & { readonly line?: unknown }).line
  return typeof value === 'string' ? value : ''
}

function renderPalette(
  options: AvtiSlashPaletteOptions,
  visibility: AvtiSlashPaletteVisibility,
): AvtiSlashPaletteVisibility {
  const output = options.output ?? process.stdout
  const input = options.input ?? process.stdin
  if (output.isTTY !== true || input.isTTY !== true) return visibility

  const line = currentReadlineLine(options.readline)
  const nextVisibility = nextAvtiSlashPaletteVisibility(visibility, line)
  clearPalette(output)
  if (nextVisibility.dismissed) return nextVisibility

  const suggestions = filterAvtiCommandSuggestions(line, options.getSuggestions())
  if (suggestions.length === 0) return nextVisibility

  const commandWidth = Math.max(...suggestions.map(suggestion => suggestion.command.length))
  const rows = suggestions.map(suggestion => {
    const command = suggestion.command.padEnd(commandWidth)
    const hint = suggestion.hint === undefined ? '' : ` ${suggestion.hint}`
    const source = suggestion.source === 'harness' ? ' · Harness' : ''
    return `  ${command}${hint}  ${DIM}${suggestion.description}${source}${RESET}`
  })
  rows.push(`  ${DIM}Esc close · keep typing to filter${RESET}`)

  output.write(`${SAVE_CURSOR}${MOVE_DOWN}\r${rows.join('\n')}\n${RESTORE_CURSOR}`)
  return nextVisibility
}

function formatPromptFailure(cause: unknown): string {
  return cause instanceof Error ? cause.stack ?? cause.message : String(cause)
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
  let keypressAttached = false
  let visibility: AvtiSlashPaletteVisibility = { dismissed: false }

  const scheduleRender = (): void => {
    if (!active || scheduled) return
    scheduled = true
    setImmediate(() => {
      scheduled = false
      if (!active) return
      try {
        visibility = renderPalette(options, visibility)
      } catch (cause) {
        active = false
        process.stderr.write(`avti: slash palette failed: ${formatPromptFailure(cause)}\n`)
      }
    })
  }

  const onKeypress = (_character: string | undefined, key?: { readonly name?: string }): void => {
    if (!active) return
    const keyName = key?.name
    const line = currentReadlineLine(options.readline)
    visibility = nextAvtiSlashPaletteVisibility(visibility, line, keyName)

    if (keyName === 'escape' && visibility.dismissed) {
      try {
        clearPalette(output)
      } catch {
        // Escape must still dismiss logically even if terminal cleanup fails.
      }
      return
    }

    scheduleRender()
  }

  if (input.isTTY === true && output.isTTY === true) {
    try {
      input.on('keypress', onKeypress)
      keypressAttached = true
    } catch (cause) {
      process.stderr.write(`avti: slash palette disabled: ${formatPromptFailure(cause)}\n`)
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
      try {
        clearPalette(output)
      } catch {
        // Terminal cleanup must never hide the underlying prompt result/error.
      }
    }
  }
}
