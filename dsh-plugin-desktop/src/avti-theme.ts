/**
 * Avti Design System & Theme Engine — "Quantum Aurora & Obsidian"
 *
 * Provides truecolor, 256-color and 16-color palettes, gradient interpolation,
 * telemetry indicators, and persistent user configuration for Avti CLI/TUI.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

export type AvtiThemeId =
  | 'aurora'
  | 'antigravity'
  | 'solar-amber'
  | 'cyber-matrix'
  | 'ice-slate'
  | 'clean-mono'
  | 'orbit'
  | 'claude'
  | 'midnight'
  | 'forest'
  | 'mono'

export type AvtiTone =
  | 'accent'
  | 'accentBright'
  | 'text'
  | 'muted'
  | 'subtle'
  | 'success'
  | 'warning'
  | 'error'

export interface RgbColor {
  readonly r: number
  readonly g: number
  readonly b: number
}

export interface AvtiTheme {
  readonly id: AvtiThemeId
  readonly name: string
  readonly description: string
  readonly accentAnsi: string
  readonly secondaryAnsi: string
  readonly successAnsi: string
  readonly warningAnsi: string
  readonly errorAnsi: string
  readonly subtleAnsi: string
  readonly borderAnsi: string
  readonly accentRgb: RgbColor
  readonly secondaryRgb: RgbColor
  readonly tones: Readonly<Record<AvtiTone, string>>
  readonly selectionAnsi: string
}

export interface AvtiThemeRef {
  current: AvtiTheme
}

const ESC = '\x1b['
export const RESET = '\x1b[0m'
export const BOLD = '\x1b[1m'
export const DIM = '\x1b[2m'
export const ITALIC = '\x1b[3m'

export function fgRgb(r: number, g: number, b: number): string {
  return `${ESC}38;2;${Math.max(0, Math.min(255, Math.round(r)))};${Math.max(0, Math.min(255, Math.round(g)))};${Math.max(0, Math.min(255, Math.round(b)))}m`
}

export function bgRgb(r: number, g: number, b: number): string {
  return `${ESC}48;2;${Math.max(0, Math.min(255, Math.round(r)))};${Math.max(0, Math.min(255, Math.round(g)))};${Math.max(0, Math.min(255, Math.round(b)))}m`
}

export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace(/^#/u, '').trim()
  if (clean.length === 3) {
    const r = Number.parseInt(clean[0]! + clean[0]!, 16)
    const g = Number.parseInt(clean[1]! + clean[1]!, 16)
    const b = Number.parseInt(clean[2]! + clean[2]!, 16)
    return { r, g, b }
  }
  const num = Number.parseInt(clean.slice(0, 6), 16)
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function ansi256(index: number): string {
  return `${ESC}38;5;${index}m`
}

export const AVTI_THEMES: readonly AvtiTheme[] = [
  {
    id: 'aurora',
    name: 'Avti Aurora',
    description: 'Signature Electric Cyan & Quantum Purple on Obsidian',
    accentAnsi: fgRgb(0, 245, 255), // Electric Cyan
    secondaryAnsi: fgRgb(168, 85, 247), // Quantum Purple
    successAnsi: fgRgb(16, 185, 129), // Emerald
    warningAnsi: fgRgb(245, 158, 11), // Solar Amber
    errorAnsi: fgRgb(239, 68, 68), // Crimson
    subtleAnsi: fgRgb(100, 116, 139), // Slate
    borderAnsi: fgRgb(51, 65, 85),
    accentRgb: { r: 0, g: 245, b: 255 },
    secondaryRgb: { r: 168, g: 85, b: 247 },
    tones: {
      accent: fgRgb(0, 245, 255),
      accentBright: fgRgb(103, 232, 249),
      text: fgRgb(248, 250, 252),
      muted: fgRgb(148, 163, 184),
      subtle: fgRgb(100, 116, 139),
      success: fgRgb(16, 185, 129),
      warning: fgRgb(245, 158, 11),
      error: fgRgb(239, 68, 68),
    },
    selectionAnsi: `${bgRgb(30, 41, 59)}${fgRgb(0, 245, 255)}`,
  },
  {
    id: 'antigravity',
    name: 'Antigravity Core',
    description: 'Deep Cyber Violet & Neon Magenta Singularity',
    accentAnsi: fgRgb(192, 38, 211),
    secondaryAnsi: fgRgb(59, 130, 246),
    successAnsi: fgRgb(52, 211, 153),
    warningAnsi: fgRgb(251, 191, 36),
    errorAnsi: fgRgb(244, 63, 94),
    subtleAnsi: fgRgb(120, 113, 108),
    borderAnsi: fgRgb(76, 29, 149),
    accentRgb: { r: 192, g: 38, b: 211 },
    secondaryRgb: { r: 59, g: 130, b: 246 },
    tones: {
      accent: fgRgb(192, 38, 211),
      accentBright: fgRgb(232, 121, 249),
      text: fgRgb(250, 250, 250),
      muted: fgRgb(168, 162, 158),
      subtle: fgRgb(120, 113, 108),
      success: fgRgb(52, 211, 153),
      warning: fgRgb(251, 191, 36),
      error: fgRgb(244, 63, 94),
    },
    selectionAnsi: `${bgRgb(76, 29, 149)}${fgRgb(250, 250, 250)}`,
  },
  {
    id: 'solar-amber',
    name: 'Solar Amber',
    description: 'Warm Cyberpunk Golden CRT phosphor glow',
    accentAnsi: fgRgb(245, 158, 11),
    secondaryAnsi: fgRgb(251, 191, 36),
    successAnsi: fgRgb(34, 197, 94),
    warningAnsi: fgRgb(234, 88, 12),
    errorAnsi: fgRgb(220, 38, 38),
    subtleAnsi: fgRgb(161, 98, 7),
    borderAnsi: fgRgb(120, 53, 15),
    accentRgb: { r: 245, g: 158, b: 11 },
    secondaryRgb: { r: 251, g: 191, b: 36 },
    tones: {
      accent: fgRgb(245, 158, 11),
      accentBright: fgRgb(253, 224, 71),
      text: fgRgb(254, 243, 199),
      muted: fgRgb(217, 119, 6),
      subtle: fgRgb(161, 98, 7),
      success: fgRgb(34, 197, 94),
      warning: fgRgb(234, 88, 12),
      error: fgRgb(220, 38, 38),
    },
    selectionAnsi: `${bgRgb(120, 53, 15)}${fgRgb(253, 224, 71)}`,
  },
  {
    id: 'cyber-matrix',
    name: 'Cyber Matrix',
    description: 'Phosphor Matrix Green & High-Tech Terminal Jade',
    accentAnsi: fgRgb(34, 197, 94),
    secondaryAnsi: fgRgb(16, 185, 129),
    successAnsi: fgRgb(74, 222, 128),
    warningAnsi: fgRgb(234, 179, 8),
    errorAnsi: fgRgb(248, 113, 113),
    subtleAnsi: fgRgb(75, 85, 99),
    borderAnsi: fgRgb(20, 83, 45),
    accentRgb: { r: 34, g: 197, b: 94 },
    secondaryRgb: { r: 16, g: 185, b: 129 },
    tones: {
      accent: fgRgb(34, 197, 94),
      accentBright: fgRgb(74, 222, 128),
      text: fgRgb(240, 253, 244),
      muted: fgRgb(134, 239, 172),
      subtle: fgRgb(75, 85, 99),
      success: fgRgb(74, 222, 128),
      warning: fgRgb(234, 179, 8),
      error: fgRgb(248, 113, 113),
    },
    selectionAnsi: `${bgRgb(20, 83, 45)}${fgRgb(240, 253, 244)}`,
  },
  {
    id: 'ice-slate',
    name: 'Ice Slate',
    description: 'Nordic Frost & Arctic Glacial Slate Blue',
    accentAnsi: fgRgb(56, 189, 248),
    secondaryAnsi: fgRgb(148, 163, 184),
    successAnsi: fgRgb(45, 212, 191),
    warningAnsi: fgRgb(251, 146, 60),
    errorAnsi: fgRgb(251, 113, 133),
    subtleAnsi: fgRgb(100, 116, 139),
    borderAnsi: fgRgb(51, 65, 85),
    accentRgb: { r: 56, g: 189, b: 248 },
    secondaryRgb: { r: 148, g: 163, b: 184 },
    tones: {
      accent: fgRgb(56, 189, 248),
      accentBright: fgRgb(125, 211, 252),
      text: fgRgb(241, 245, 249),
      muted: fgRgb(148, 163, 184),
      subtle: fgRgb(100, 116, 139),
      success: fgRgb(45, 212, 191),
      warning: fgRgb(251, 146, 60),
      error: fgRgb(251, 113, 133),
    },
    selectionAnsi: `${bgRgb(30, 58, 138)}${fgRgb(241, 245, 249)}`,
  },
  {
    id: 'clean-mono',
    name: 'Clean Mono',
    description: 'Minimalist high-contrast pure monochrome',
    accentAnsi: fgRgb(248, 250, 252),
    secondaryAnsi: fgRgb(203, 213, 225),
    successAnsi: fgRgb(241, 245, 249),
    warningAnsi: fgRgb(226, 232, 240),
    errorAnsi: fgRgb(255, 255, 255),
    subtleAnsi: fgRgb(100, 116, 139),
    borderAnsi: fgRgb(71, 85, 105),
    accentRgb: { r: 248, g: 250, b: 252 },
    secondaryRgb: { r: 203, g: 213, b: 225 },
    tones: {
      accent: fgRgb(248, 250, 252),
      accentBright: fgRgb(255, 255, 255),
      text: fgRgb(241, 245, 249),
      muted: fgRgb(148, 163, 184),
      subtle: fgRgb(100, 116, 139),
      success: fgRgb(241, 245, 249),
      warning: fgRgb(226, 232, 240),
      error: fgRgb(255, 255, 255),
    },
    selectionAnsi: `${bgRgb(71, 85, 105)}${fgRgb(255, 255, 255)}`,
  },
  {
    id: 'orbit',
    name: 'Avti Orbit',
    description: 'Minimalist monochrome with electric cyan focus',
    accentAnsi: ansi256(51),
    secondaryAnsi: ansi256(141),
    successAnsi: ansi256(49),
    warningAnsi: ansi256(214),
    errorAnsi: ansi256(196),
    subtleAnsi: ansi256(241),
    borderAnsi: ansi256(238),
    accentRgb: { r: 0, g: 245, b: 255 },
    secondaryRgb: { r: 168, g: 85, b: 247 },
    tones: {
      accent: ansi256(51),
      accentBright: ansi256(123),
      text: ansi256(255),
      muted: ansi256(247),
      subtle: ansi256(241),
      success: ansi256(49),
      warning: ansi256(214),
      error: ansi256(196),
    },
    selectionAnsi: `${ESC}48;5;236;38;5;51m`,
  },
  {
    id: 'claude',
    name: 'Claude Warm',
    description: 'Warm orange accent inspired by Claude Code',
    accentAnsi: `${ESC}38;5;208m`,
    secondaryAnsi: `${ESC}38;5;178m`,
    successAnsi: `${ESC}38;5;114m`,
    warningAnsi: `${ESC}38;5;214m`,
    errorAnsi: `${ESC}38;5;196m`,
    subtleAnsi: `${ESC}38;5;244m`,
    borderAnsi: `${ESC}38;5;238m`,
    accentRgb: { r: 255, g: 135, b: 0 },
    secondaryRgb: { r: 215, g: 175, b: 0 },
    tones: {
      accent: `${ESC}38;5;208m`,
      accentBright: `${ESC}38;5;214m`,
      text: `${ESC}38;5;255m`,
      muted: `${ESC}38;5;247m`,
      subtle: `${ESC}38;5;244m`,
      success: `${ESC}38;5;114m`,
      warning: `${ESC}38;5;214m`,
      error: `${ESC}38;5;196m`,
    },
    selectionAnsi: `${ESC}48;5;237;38;5;208m`,
  },
  {
    id: 'midnight',
    name: 'Avti Midnight',
    description: 'Cool violet and blue accents for dark terminals',
    accentAnsi: `${ESC}38;5;45m`,
    secondaryAnsi: `${ESC}38;5;39m`,
    successAnsi: `${ESC}38;5;48m`,
    warningAnsi: `${ESC}38;5;220m`,
    errorAnsi: `${ESC}38;5;203m`,
    subtleAnsi: `${ESC}38;5;242m`,
    borderAnsi: `${ESC}38;5;236m`,
    accentRgb: { r: 0, g: 215, b: 255 },
    secondaryRgb: { r: 0, g: 175, b: 255 },
    tones: {
      accent: ansi256(111),
      accentBright: ansi256(147),
      text: ansi256(255),
      muted: ansi256(247),
      subtle: ansi256(241),
      success: ansi256(79),
      warning: ansi256(221),
      error: ansi256(203),
    },
    selectionAnsi: `${ESC}48;5;236;38;5;111m`,
  },
  {
    id: 'forest',
    name: 'Avti Forest',
    description: 'Muted sage and forest green terminal accent',
    accentAnsi: `${ESC}38;5;114m`,
    secondaryAnsi: `${ESC}38;5;150m`,
    successAnsi: `${ESC}38;5;120m`,
    warningAnsi: `${ESC}38;5;215m`,
    errorAnsi: `${ESC}38;5;203m`,
    subtleAnsi: `${ESC}38;5;243m`,
    borderAnsi: `${ESC}38;5;237m`,
    accentRgb: { r: 135, g: 215, b: 135 },
    secondaryRgb: { r: 175, g: 215, b: 135 },
    tones: {
      accent: ansi256(108),
      accentBright: ansi256(151),
      text: ansi256(255),
      muted: ansi256(247),
      subtle: ansi256(241),
      success: ansi256(114),
      warning: ansi256(215),
      error: ansi256(203),
    },
    selectionAnsi: `${ESC}48;5;237;38;5;108m`,
  },
  {
    id: 'mono',
    name: 'Avti Mono',
    description: 'Plain text without color escapes',
    accentAnsi: '',
    secondaryAnsi: '',
    successAnsi: '',
    warningAnsi: '',
    errorAnsi: '',
    subtleAnsi: '',
    borderAnsi: '',
    accentRgb: { r: 255, g: 255, b: 255 },
    secondaryRgb: { r: 200, g: 200, b: 200 },
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
    selectionAnsi: '',
  },
] as const

export function resolveAvtiTheme(id: string | undefined): AvtiTheme | undefined {
  if (id === undefined) return undefined
  const needle = id.toLowerCase().trim()
  return AVTI_THEMES.find(theme => theme.id === needle)
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
    // First run, malformed optional UI state, or a read-only home: use the signature default.
  }
  return AVTI_THEMES[0]! // 'aurora'
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
  if (!avtiTerminalColorEnabled(output, environment)) return text
  const toneAnsi = theme.tones[tone]
  if (toneAnsi === '') return text
  return `${toneAnsi}${text}${RESET}`
}

export function styleAvtiSelection(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (!avtiTerminalColorEnabled(output, environment) || theme.selectionAnsi === '') return text
  return `${theme.selectionAnsi}${text}${RESET}`
}

export function styleAvtiAccent(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return styleAvtiTone(text, 'accent', theme, output, environment)
}

export function styleAvtiSecondary(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (theme.secondaryAnsi === '' || !avtiTerminalColorEnabled(output, environment)) return text
  return `${theme.secondaryAnsi}${text}${RESET}`
}

export function styleAvtiSubtle(
  text: string,
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return styleAvtiTone(text, 'subtle', theme, output, environment)
}

/** Interpolate between two RGB colors across string characters for smooth gradient text */
export function styleAvtiGradient(
  text: string,
  start: RgbColor,
  end: RgbColor,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (!avtiTerminalColorEnabled(output, environment) || text.length === 0) return text
  const length = text.length
  if (length === 1) return `${fgRgb(start.r, start.g, start.b)}${text}${RESET}`

  let result = ''
  for (let i = 0; i < length; i++) {
    const factor = i / (length - 1)
    const r = start.r + factor * (end.r - start.r)
    const g = start.g + factor * (end.g - start.g)
    const b = start.b + factor * (end.b - start.b)
    result += `${fgRgb(r, g, b)}${text[i]}`
  }
  return `${result}${RESET}`
}

export function formatAvtiPrompt(
  theme: AvtiTheme,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return `${styleAvtiAccent('›', theme, output, environment)} `
}

/**
 * Segmented Context Progress Bar
 * e.g. [████████░░░░░░░░] 52% (104k/200k)
 */
export function renderAvtiProgressBar(
  used: number,
  total: number,
  width = 16,
  theme: AvtiTheme = AVTI_THEMES[0]!,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (total <= 0) return ''
  const ratio = Math.max(0, Math.min(1, used / total))
  const filledCount = Math.round(ratio * width)
  const emptyCount = Math.max(0, width - filledCount)

  const filledChar = '█'
  const emptyChar = '░'

  let colorAnsi = theme.accentAnsi
  if (ratio > 0.85) colorAnsi = theme.errorAnsi
  else if (ratio > 0.65) colorAnsi = theme.warningAnsi

  const color = avtiTerminalColorEnabled(output, environment)
  const filledStr = color ? `${colorAnsi}${filledChar.repeat(filledCount)}${RESET}` : filledChar.repeat(filledCount)
  const emptyStr = color ? `${theme.borderAnsi || DIM}${emptyChar.repeat(emptyCount)}${RESET}` : emptyChar.repeat(emptyCount)

  return `[${filledStr}${emptyStr}]`
}

/**
 * Renders an ASCII sparkline graph from numeric samples (e.g. TPS or latency)
 */
export function renderAvtiSparkline(
  samples: readonly number[],
  theme: AvtiTheme = AVTI_THEMES[0]!,
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  if (samples.length === 0) return ''
  const GLYPHS = [' ', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const min = Math.min(...samples)
  const max = Math.max(...samples)
  const range = max - min || 1

  const chars = samples.map(val => {
    const idx = Math.min(GLYPHS.length - 1, Math.max(0, Math.floor(((val - min) / range) * (GLYPHS.length - 1))))
    return GLYPHS[idx]
  }).join('')

  if (!avtiTerminalColorEnabled(output, environment)) return chars
  return `${theme.accentAnsi}${chars}${RESET}`
}
