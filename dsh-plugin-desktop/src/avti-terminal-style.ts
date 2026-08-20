/**
 * Avti Terminal Presentation & Motion System — "Quantum Singularity HUD"
 *
 * Implements high-resolution 40x13 ANSI half-block artwork, 5-row block typography,
 * telemetry HUD decks, live working lines, and 3-row status footers for Avti CLI.
 */

import type { WriteStream } from 'node:tty'
import {
  AVTI_THEMES,
  bgRgb,
  BOLD,
  DIM,
  fgRgb,
  hexToRgb,
  ITALIC,
  loadAvtiTheme,
  renderAvtiProgressBar,
  renderAvtiSparkline,
  RESET,
  styleAvtiAccent,
  styleAvtiGradient,
  type AvtiTheme,
  type RgbColor,
} from './avti-theme.ts'

export const AVTI_ORBIT_FRAMES = ['◜', '◝', '◞', '◟'] as const

export const AVTI_QUANTUM_FRAMES = [
  '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏',
] as const

export const AVTI_PULSE_FRAMES = [
  '∙····',
  '·∙···',
  '··∙··',
  '···∙·',
  '····∙',
  '···∙·',
  '··∙··',
  '·∙···',
] as const

export const AVTI_ACCELERATOR_FRAMES = [
  '⟪•    ⟫',
  '⟪ •   ⟫',
  '⟪  •  ⟫',
  '⟪   • ⟫',
  '⟪    •⟫',
  '⟪   • ⟫',
  '⟪  •  ⟫',
  '⟪ •   ⟫',
] as const

export const AVTI_INTRO_FRAMES = ['A', 'AV', 'AVT', 'AVTI'] as const

export interface AvtiTerminalOutput {
  readonly isTTY?: boolean
  write(chunk: string): boolean
}

export interface AvtiMotionOptions {
  readonly output?: AvtiTerminalOutput
  readonly environment?: NodeJS.ProcessEnv
  readonly frameDelayMs?: number
  readonly sleep?: (milliseconds: number) => Promise<void>
  readonly theme?: AvtiTheme
  readonly provider?: string
  readonly model?: string
  readonly cwd?: string
  readonly gitBranch?: string
}

export interface AvtiActivityOptions {
  readonly output?: AvtiTerminalOutput
  readonly environment?: NodeJS.ProcessEnv
  readonly frames?: readonly string[]
  readonly intervalMs?: number
  readonly setInterval?: (callback: () => void, milliseconds: number) => ReturnType<typeof setInterval>
  readonly clearInterval?: (handle: ReturnType<typeof setInterval>) => void
  readonly theme?: AvtiTheme
}

export interface AvtiActivity {
  start(label: string): void
  update(label: string): void
  setFrames(frames: readonly string[]): void
  succeed(label?: string): void
  fail(label: string): void
  stop(): void
}

const ESC = '\x1b['
const ERASE_LINE = '\x1b[2K'
const CURSOR_COLUMN_ZERO = '\r'

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

export function terminalMotionEnabled(
  output: Pick<WriteStream, 'isTTY'> | { readonly isTTY?: boolean },
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  if (output.isTTY !== true) return false
  if (environment.CI !== undefined) return false
  if (environment.TERM?.toLowerCase() === 'dumb') return false
  if (environment.AVTI_NO_MOTION === '1') return false
  return true
}

export function formatAvtiActivity(frame: string, label: string): string {
  return `  ${frame} ${label}`
}

export function formatAvtiSuccess(label: string): string {
  return `  ✓ ${label}`
}

export function formatAvtiFailure(label: string): string {
  return `  × ${label}`
}

/**
 * 40x26 high-resolution Quantum Singularity Sprite (renders to 13 ANSI rows via ▀/▄ half-blocks)
 * Palette keys:
 *   'C': Electric Cyan #00F5FF
 *   'V': Quantum Violet #A855F7
 *   'B': Deep Space Blue #1D4ED8
 *   'W': Pure Singularity White #FFFFFF
 *   '.': Transparent
 */
const QUANTUM_CORE_SPRITE: readonly string[] = [
  '........CCCC................CCCC........',
  '......CCCCCC................CCCCCC......',
  '....CCCCCCCC....VVVVVVVV....CCCCCCCC....',
  '..CCCCCCCCCC..VVVVVVVVVVVV..CCCCCCCCCC..',
  '..CCCCCCCC..VVVVVVVVVVVVVVVV..CCCCCCCC..',
  '.CCCCCCCC..VVVVVVWWWWWWVVVVVV..CCCCCCCC.',
  '.CCCCCCCC.VVVVVVWWWWWWWWVVVVVV.CCCCCCCC.',
  'CCCCCCCC..VVVVVWWWWWWWWWWVVVVV..CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC..VVVVVWWWWWWWWWWVVVVV..CCCCCCCC',
  'CCCCCCCC..VVVVVWWWWWWWWWWVVVVV..CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC.VVVVVVWWWWWWWWWWVVVVVV.CCCCCCCC',
  'CCCCCCCC..VVVVVWWWWWWWWWWVVVVV..CCCCCCCC',
  '.CCCCCCCC.VVVVVVWWWWWWWWVVVVVV.CCCCCCCC.',
  '.CCCCCCCC..VVVVVVWWWWWWVVVVVV..CCCCCCCC.',
  '..CCCCCCCC..VVVVVVVVVVVVVVVV..CCCCCCCC..',
  '..CCCCCCCCCC..VVVVVVVVVVVV..CCCCCCCCCC..',
  '....CCCCCCCC....VVVVVVVV....CCCCCCCC....',
  '......CCCCCC................CCCCCC......',
  '........CCCC................CCCC........',
]

const SPRITE_PALETTE: Record<string, RgbColor | undefined> = {
  C: { r: 0, g: 245, b: 255 },
  V: { r: 168, g: 85, b: 247 },
  B: { r: 29, g: 78, b: 216 },
  W: { r: 255, g: 255, b: 255 },
}

/** Render 13 ANSI half-block rows for the Avti Quantum Core */
export function renderAvtiCoreLogo(theme: AvtiTheme = AVTI_THEMES[0]!): string[] {
  const rows: string[] = []
  for (let r = 0; r < QUANTUM_CORE_SPRITE.length; r += 2) {
    const topRow = QUANTUM_CORE_SPRITE[r] ?? ''
    const bottomRow = QUANTUM_CORE_SPRITE[r + 1] ?? ''
    let line = ''
    for (let c = 0; c < 40; c++) {
      const topChar = topRow[c] ?? '.'
      const bottomChar = bottomRow[c] ?? '.'

      const topColor = topChar === 'C' ? theme.accentRgb : topChar === 'V' ? theme.secondaryRgb : SPRITE_PALETTE[topChar]
      const bottomColor = bottomChar === 'C' ? theme.accentRgb : bottomChar === 'V' ? theme.secondaryRgb : SPRITE_PALETTE[bottomChar]

      if (topColor && bottomColor) {
        line += `${fgRgb(topColor.r, topColor.g, topColor.b)}${bgRgb(bottomColor.r, bottomColor.g, bottomColor.b)}▀${RESET}`
      } else if (topColor) {
        line += `${fgRgb(topColor.r, topColor.g, topColor.b)}▀${RESET}`
      } else if (bottomColor) {
        line += `${fgRgb(bottomColor.r, bottomColor.g, bottomColor.b)}▄${RESET}`
      } else {
        line += ' '
      }
    }
    rows.push(line)
  }
  return rows
}

/** 5-row big block text font for AVTI and AGENTIC */
const BIG_BLOCK_AVTI: readonly string[] = [
  ' ▄▀▄   █   █  ▀███▀  ▀█▀',
  '█   █  █   █    █     █ ',
  '█▀▀▀█  █   █    █     █ ',
  '█   █   █ █     █     █ ',
  '█   █    █      █    ▄█▄',
]

const BIG_BLOCK_AGENTIC: readonly string[] = [
  ' ▄▀▄    ▄▀▀▀  █▀▀▀▀  █   █  ▀███▀   ▄▀▀▀',
  '█   █  █      █      ██  █    █    █    ',
  '█▀▀▀█  █ ▀▀█  █▀▀▀   █ █ █    █    █    ',
  '█   █  █   █  █      █  ██    █    █    ',
  '█   █   ▀▄▄█  █▄▄▄▄  █   █    █     ▀▄▄▄',
]

export const AVTI_TIPS: readonly string[] = [
  'Type / to browse live slash-commands, models, themes and diagnostics.',
  'Use @<file> in any prompt to instantly attach file contents or image blocks.',
  'Avti bridges natively with Antigravity, ClaudeGravity, Gemini and local providers.',
  'Run avti demo or /presentation for a scripted autonomous agent showcase.',
  'Switch themes on the fly with /theme aurora, /theme antigravity, or /theme solar-amber.',
  'Press Ctrl+C once to cancel current generation, twice to exit cleanly.',
  'Review saved sessions and resume anytime using avti resume <session-id>.',
] as const

export function pickRandomAvtiTip(): string {
  const index = Math.floor(Math.random() * AVTI_TIPS.length)
  return AVTI_TIPS[index] ?? AVTI_TIPS[0]!
}

/**
 * Render the full Avti Splash Hero Header matching dsh-TUI/splash.png layout
 */
export function renderAvtiHeader(options: {
  theme?: AvtiTheme
  provider?: string
  model?: string
  cwd?: string
  gitBranch?: string
  version?: string
  tip?: string
} = {}): string {
  const theme = options.theme ?? loadAvtiTheme()
  const version = options.version ?? '0.1.0'
  const provider = options.provider ?? 'antigravity'
  const model = options.model ?? 'gemini-3.7-flash-high'
  const cwd = options.cwd ?? process.cwd()

  const logoRows = renderAvtiCoreLogo(theme)
  const bigAvtiStyled = BIG_BLOCK_AVTI.map(row => styleAvtiGradient(row, theme.accentRgb, theme.secondaryRgb))
  const bigAgenticStyled = BIG_BLOCK_AGENTIC.map(row => styleAvtiGradient(row, theme.secondaryRgb, theme.accentRgb))

  const lines: string[] = [
    '',
    `  ${logoRows[0]}    ${bigAvtiStyled[0]}`,
    `  ${logoRows[1]}    ${bigAvtiStyled[1]}`,
    `  ${logoRows[2]}    ${bigAvtiStyled[2]}`,
    `  ${logoRows[3]}    ${bigAvtiStyled[3]}`,
    `  ${logoRows[4]}    ${bigAvtiStyled[4]}`,
    `  ${logoRows[5]}    ${bigAgenticStyled[0]}`,
    `  ${logoRows[6]}    ${bigAgenticStyled[1]}`,
    `  ${logoRows[7]}    ${bigAgenticStyled[2]}`,
    `  ${logoRows[8]}    ${bigAgenticStyled[3]}`,
    `  ${logoRows[9]}    ${bigAgenticStyled[4]}`,
    `  ${logoRows[10]}    ${theme.accentAnsi}${BOLD}${model}${RESET} ${DIM}· Max effort · ${provider}${RESET}`,
    `  ${logoRows[11]}    ${DIM}${cwd}${RESET}`,
    `  ${logoRows[12]}    ${DIM}Tip: /model · /theme · /help · Tab complete${RESET}`,
    `   ${theme.accentAnsi}✦ QUANTUM SINGULARITY AGENTIC PLATFORM ✦${RESET}`,
    '',
  ]

  return lines.join('\n')
}

/**
 * Render the 3-row PromptInputFooter / StatusLine HUD matching dsh-TUI/splash.png & working-line.png
 */
export function renderAvtiStatusFooter(options: {
  theme?: AvtiTheme
  model?: string
  effort?: string
  tps?: number
  inputTokens?: number
  outputTokens?: number
  cacheHitPct?: number
  gitBranch?: string
  sessionCwd?: string
  sessionTitle?: string
  contextUsed?: number
  contextTotal?: number
  statusText?: string
}): string {
  const theme = options.theme ?? loadAvtiTheme()
  const model = options.model ?? 'gemini-3.7-flash-high'
  const effort = options.effort ?? 'max'
  const tps = options.tps ?? 95.2
  const inTok = options.inputTokens ?? 14200
  const outTok = options.outputTokens ?? 2200
  const cachePct = options.cacheHitPct ?? 99.4
  const branch = options.gitBranch ?? 'feat/avti-cli'
  const cwd = options.sessionCwd ?? 'Avti'
  const title = options.sessionTitle ?? 'session-1'
  const ctxUsed = options.contextUsed ?? 14200
  const ctxTotal = options.contextTotal ?? 1000000
  const statusMsg = options.statusText ?? '✓ All systems operational'

  const ctxPct = ((ctxUsed / ctxTotal) * 100).toFixed(1)
  const ctxUsedK = (ctxUsed / 1000).toFixed(1) + 'k'
  const ctxTotalM = (ctxTotal / 1000000).toFixed(1) + 'M'
  const freeK = ((ctxTotal - ctxUsed) / 1000).toFixed(0) + 'k'

  // Row 1: Segmented Context Pill & readout
  const pillSys = `${bgRgb(59, 130, 246)}${fgRgb(255, 255, 255)} sys ${RESET}`
  const pillPrompt = `${bgRgb(168, 85, 247)}${fgRgb(255, 255, 255)} prompt ${RESET}`
  const pillThink = `${bgRgb(0, 245, 255)}${fgRgb(15, 23, 42)} think ${RESET}`
  const pillTools = `${bgRgb(16, 185, 129)}${fgRgb(255, 255, 255)} tools ${RESET}`
  const pillBlock = ` [${pillSys}${pillPrompt}${pillThink}${pillTools}]`

  const row1 = `${pillBlock}                         ${DIM}free${RESET}                        ${DIM}ctx ${ctxUsedK}/${ctxTotalM} ${ctxPct}% ${freeK}${RESET}`

  // Row 2: Live Status Line
  const tpsGauge = `|.........| ${theme.accentAnsi}${tps.toFixed(0)} tps${RESET}`
  const inOut = `${(inTok / 1000).toFixed(1)}k→${(outTok / 1000).toFixed(1)}k`
  const leftTelemetry = ` ${theme.accentAnsi}${model}${RESET} · ${effort} · ${tpsGauge} · cache ${cachePct}% · ${inOut}`
  const rightTelemetry = `${theme.secondaryAnsi}${branch}${RESET} · ${cwd} · ${title}`
  const row2 = `${leftTelemetry}              ${rightTelemetry}`

  // Row 3: Mode / Hint Line
  const leftMode = ` ${theme.successAnsi}${statusMsg}${RESET} · ${theme.warningAnsi}🔥 9.1k${RESET}`
  const rightMode = `${DIM}? for shortcuts · /theme${RESET}`
  const row3 = `${leftMode}                                  ${rightMode}`

  return [
    `${theme.borderAnsi || DIM}───────────────────────────────────────────────────────────────────────────────────────────────────${RESET}`,
    row1,
    row2,
    row3,
    '',
  ].join('\n')
}

/**
 * Render the Live Working Line (Activity Bar) matching dsh-TUI/working-line.png
 */
export function renderAvtiLiveWorkingLine(options: {
  actionText: string
  elapsedSeconds?: number
  tokensCount?: number
  category?: string
  theme?: AvtiTheme
}): string {
  const theme = options.theme ?? loadAvtiTheme()
  const elapsed = options.elapsedSeconds ?? 1.4
  const tokens = options.tokensCount ?? 1420
  const cat = options.category ?? 'ts'

  const blockIcon = `${bgRgb(0, 245, 255)}${fgRgb(15, 23, 42)} ■■■ ⚡ ${RESET}`
  const lineContent = ` ${blockIcon} ${BOLD}${options.actionText}${RESET} ${DIM}· ${elapsed}s · ${cat} · ↓ ${tokens} tokens${RESET}`

  const border = theme.borderAnsi || DIM
  return [
    `  ${border}┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓${RESET}`,
    `  ${border}┃${RESET}${lineContent.padEnd(100)}${border}┃${RESET}`,
    `  ${border}┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛${RESET}`,
  ].join('\n')
}

export function createAvtiActivity(options: AvtiActivityOptions = {}): AvtiActivity {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  let frames = options.frames?.length ? options.frames : AVTI_ORBIT_FRAMES
  const intervalMs = options.intervalMs ?? 90
  const schedule = options.setInterval ?? ((callback, milliseconds) => setInterval(callback, milliseconds))
  const cancel = options.clearInterval ?? (handle => clearInterval(handle))
  const motion = terminalMotionEnabled(output, environment)

  let label = ''
  let frameIndex = 0
  let timer: ReturnType<typeof setInterval> | undefined
  let active = false

  const writeFrame = (): void => {
    if (!active) return
    const frame = frames[frameIndex % frames.length]!
    frameIndex += 1
    if (motion) output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}${formatAvtiActivity(frame, label)}`)
  }

  const finishTransient = (): void => {
    if (!active) return
    active = false
    if (timer !== undefined) {
      cancel(timer)
      timer = undefined
    }
    if (motion) output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}`)
  }

  return {
    start(nextLabel: string) {
      if (active) return
      label = nextLabel
      frameIndex = 0
      active = true
      if (!motion) {
        output.write(`${formatAvtiActivity('·', label)}\n`)
        return
      }
      writeFrame()
      timer = schedule(writeFrame, intervalMs)
    },
    update(nextLabel: string) {
      const changed = nextLabel !== label
      label = nextLabel
      if (!active) return
      if (motion) writeFrame()
      else if (changed) output.write(`${formatAvtiActivity('·', label)}\n`)
    },
    setFrames(nextFrames: readonly string[]) {
      if (nextFrames.length === 0) return
      frames = nextFrames
      frameIndex = 0
    },
    succeed(nextLabel = 'Done') {
      if (!active) return
      finishTransient()
      output.write(`${formatAvtiSuccess(nextLabel)}\n`)
    },
    fail(nextLabel: string) {
      if (!active) return
      finishTransient()
      output.write(`${formatAvtiFailure(nextLabel)}\n`)
    },
    stop() {
      finishTransient()
    },
  }
}

export async function renderAvtiIntro(options: AvtiMotionOptions = {}): Promise<void> {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  const frameDelayMs = options.frameDelayMs ?? 110
  const sleep = options.sleep ?? defaultSleep

  if (output.isTTY !== true || environment.CI !== undefined) return
  if (!terminalMotionEnabled(output, environment)) {
    output.write('AVTI\n\n')
    return
  }

  for (let index = 0; index < AVTI_INTRO_FRAMES.length; index += 1) {
    output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}${AVTI_INTRO_FRAMES[index]}`)
    if (index + 1 < AVTI_INTRO_FRAMES.length) await sleep(frameDelayMs)
  }
  await sleep(160)
  output.write('\n\n')
}
