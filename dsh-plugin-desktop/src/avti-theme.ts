/** Small persistent color themes for Avti terminal chrome. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type AvtiThemeId = 'claude' | 'midnight' | 'forest' | 'mono'

export interface AvtiTheme {
  readonly id: AvtiThemeId
  readonly name: string
  readonly description: string
  readonly accentAnsi: string
}

export interface AvtiThemeRef {
  current: AvtiTheme
}

const ESC = '\u001b['
const RESET = `${ESC}0m`

export const AVTI_THEMES: readonly AvtiTheme[] = [
  {
    id: 'claude',
    name: 'Claude Warm',
    description: 'Warm orange accent inspired by Claude Code',
    accentAnsi: `${ESC}38;5;208m`,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Cool cyan accent for dark terminals',
    accentAnsi: `${ESC}38;5;45m`,
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Muted green terminal accent',
    accentAnsi: `${ESC}38;5;114m`,
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'No terminal color styling',
    accentAnsi: '',
  },
] as const

export function resolveAvtiTheme(id: string | undefined): AvtiTheme | undefined {
  if (id === undefined) return undefined
  return AVTI_THEMES.find(theme => theme.id === id.toLowerCase())
}

function avtiUiConfigPath(environment: NodeJS.ProcessEnv): string {
  const configuredHome = environment.DSH_HOME?.trim()
  const home = configuredHome === undefined || configuredHome === ''
    ? join(homedir(), '.avti', 'cli')
    : configuredHome
  return join(home, 'ui.json')
}

export function loadAvtiTheme(environment: NodeJS.ProcessEnv = process.env): AvtiTheme {
  const environmentTheme = resolveAvtiTheme(environment.AVTI_THEME?.trim())
  if (environmentTheme !== undefined) return environmentTheme

  try {
    const parsed = JSON.parse(readFileSync(avtiUiConfigPath(environment), 'utf8')) as { theme?: unknown }
    if (typeof parsed.theme === 'string') {
      const stored = resolveAvtiTheme(parsed.theme)
      if (stored !== undefined) return stored
    }
  } catch {
    // First run, malformed optional UI state, or a read-only home: use the default.
  }
  return AVTI_THEMES[0]!
}

export function saveAvtiTheme(
  id: AvtiThemeId,
  environment: NodeJS.ProcessEnv = process.env,
): AvtiTheme {
  const theme = resolveAvtiTheme(id)
  if (theme === undefined) throw new Error(`Unknown Avti theme: ${id}`)
  const path = avtiUiConfigPath(environment)
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  writeFileSync(path, `${JSON.stringify({ theme: theme.id }, null, 2)}\n`, { mode: 0o600 })
  return theme
}

export function avtiTerminalColorEnabled(
  output: { readonly isTTY?: boolean },
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (output.isTTY !== true) return false
  if (environment.NO_COLOR !== undefined) return false
  if (environment.TERM?.toLowerCase() === 'dumb') return false
  return true
}

export function styleAvtiAccent(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (theme.accentAnsi === '' || !avtiTerminalColorEnabled(output, environment)) return text
  return `${theme.accentAnsi}${text}${RESET}`
}

export function formatAvtiPrompt(
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return `${styleAvtiAccent('›', theme, output, environment)} `
}
