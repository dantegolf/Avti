/** Avti terminal visual tokens and persistent themes. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type AvtiThemeId = 'orbit' | 'midnight' | 'forest' | 'mono'
export type AvtiTone = 'accent' | 'accentBright' | 'text' | 'muted' | 'subtle' | 'success' | 'warning' | 'error'

export interface AvtiTheme {
  readonly id: AvtiThemeId
  readonly name: string
  readonly description: string
  readonly tones: Readonly<Record<AvtiTone, string>>
  readonly selectionAnsi: string
}

export interface AvtiThemeRef {
  current: AvtiTheme
}

const ESC = '\u001b['
const RESET = `${ESC}0m`

function ansi256(index: number): string {
  return `${ESC}38;5;${index}m`
}

/**
 * Avti's CLI identity is intentionally different from Claude Code's warm orange:
 * monochrome product branding, cool electric highlights, and restrained status colors.
 */
export const AVTI_THEMES: readonly AvtiTheme[] = [
  {
    id: 'orbit',
    name: 'Avti Orbit',
    description: 'Graphite, ice-white and electric cyan',
    tones: {
      accent: ansi256(81),
      accentBright: ansi256(159),
      text: ansi256(252),
      muted: ansi256(245),
      subtle: ansi256(240),
      success: ansi256(114),
      warning: ansi256(221),
      error: ansi256(203),
    },
    selectionAnsi: `${ESC}48;5;24m${ESC}38;5;231m`,
  },
  {
    id: 'midnight',
    name: 'Avti Midnight',
    description: 'Cool violet and blue for dark terminals',
    tones: {
      accent: ansi256(141),
      accentBright: ansi256(183),
      text: ansi256(252),
      muted: ansi256(245),
      subtle: ansi256(240),
      success: ansi256(114),
      warning: ansi256(221),
      error: ansi256(203),
    },
    selectionAnsi: `${ESC}48;5;54m${ESC}38;5;231m`,
  },
  {
    id: 'forest',
    name: 'Avti Forest',
    description: 'Muted green with graphite neutrals',
    tones: {
      accent: ansi256(114),
      accentBright: ansi256(151),
      text: ansi256(252),
      muted: ansi256(245),
      subtle: ansi256(240),
      success: ansi256(120),
      warning: ansi256(221),
      error: ansi256(203),
    },
    selectionAnsi: `${ESC}48;5;22m${ESC}38;5;231m`,
  },
  {
    id: 'mono',
    name: 'Avti Mono',
    description: 'Terminal-native monochrome with no color escapes',
    tones: {
      accent: '',
      accentBright: '',
      text: '',
      muted: '',
      subtle: '',
      success: '',
      warning: '',
      error: '',
    },
    selectionAnsi: `${ESC}7m`,
  },
] as const

export function resolveAvtiTheme(id: string | undefined): AvtiTheme | undefined {
  if (id === undefined) return undefined
  const normalized = id.toLowerCase()
  // Migrate the first preview theme name without breaking existing ui.json files.
  if (normalized === 'claude') return AVTI_THEMES[0]
  return AVTI_THEMES.find(theme => theme.id === normalized)
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

export function styleAvtiTone(
  text: string,
  tone: AvtiTone,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const ansi = theme.tones[tone]
  if (ansi === '' || !avtiTerminalColorEnabled(output, environment)) return text
  return `${ansi}${text}${RESET}`
}

export function styleAvtiSelection(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (!avtiTerminalColorEnabled(output, environment)) return `› ${text}`
  return `${theme.selectionAnsi}${text}${RESET}`
}

/** Compatibility helper for older call sites: the accent is now one token in a full system. */
export function styleAvtiAccent(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return styleAvtiTone(text, 'accent', theme, output, environment)
}

export function formatAvtiPrompt(
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const rail = styleAvtiTone('╰─', 'subtle', theme, output, environment)
  const mark = styleAvtiTone('›', 'accentBright', theme, output, environment)
  return `${rail} ${mark} `
}

export function formatAvtiPromptContext(
  theme: AvtiTheme,
  context: { readonly project: string; readonly provider: string; readonly model: string; readonly resumed?: boolean },
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const rail = styleAvtiTone('╭─', 'subtle', theme, output, environment)
  const brand = styleAvtiTone('AVTI', 'accent', theme, output, environment)
  const project = styleAvtiTone(context.project, 'text', theme, output, environment)
  const model = styleAvtiTone(`${context.provider}/${context.model}`, 'muted', theme, output, environment)
  const resumed = context.resumed === true ? ` ${styleAvtiTone('· resumed', 'warning', theme, output, environment)}` : ''
  return `${rail} ${brand}  ${project}  ${styleAvtiTone('·', 'subtle', theme, output, environment)}  ${model}${resumed}\n`
}
