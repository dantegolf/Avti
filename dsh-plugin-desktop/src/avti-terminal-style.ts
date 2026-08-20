/** Avti terminal presentation primitives for the Harness CLI wrapper. */

import type { WriteStream } from 'node:tty'
import { loadAvtiTheme, styleAvtiTone, type AvtiTheme } from './avti-theme.ts'

export const AVTI_ORBIT_FRAMES = ['◜', '◝', '◞', '◟'] as const
export const AVTI_PULSE_FRAMES = ['∙····', '·∙···', '··∙··', '···∙·', '····∙', '···∙·', '··∙··', '·∙···'] as const
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
}

export interface AvtiActivityOptions {
  readonly output?: AvtiTerminalOutput
  readonly environment?: NodeJS.ProcessEnv
  readonly frames?: readonly string[]
  readonly intervalMs?: number
  readonly theme?: AvtiTheme
  readonly setInterval?: (callback: () => void, milliseconds: number) => ReturnType<typeof setInterval>
  readonly clearInterval?: (handle: ReturnType<typeof setInterval>) => void
}

export interface AvtiActivity {
  start(label: string): void
  update(label: string): void
  setFrames(frames: readonly string[]): void
  succeed(label?: string): void
  fail(label: string): void
  stop(): void
}

const ESC = '\u001b['
const ERASE_LINE = `${ESC}2K`
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

function activeTheme(environment: NodeJS.ProcessEnv): AvtiTheme {
  return loadAvtiTheme(environment)
}

export function formatAvtiActivity(frame: string, label: string): string {
  return `  ${frame} ${label}`
}

export function formatAvtiSuccess(label: string): string {
  const theme = activeTheme(process.env)
  return `  ${styleAvtiTone('✓', 'success', theme)} ${styleAvtiTone(label, 'muted', theme)}`
}

export function formatAvtiFailure(label: string): string {
  const theme = activeTheme(process.env)
  return `  ${styleAvtiTone('×', 'error', theme)} ${styleAvtiTone(label, 'muted', theme)}`
}

function styledActivity(frame: string, label: string, options: AvtiActivityOptions): string {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  const theme = options.theme ?? activeTheme(environment)
  return `  ${styleAvtiTone(frame, 'accent', theme, output, environment)} ${styleAvtiTone(label, 'muted', theme, output, environment)}`
}

function styledCompletion(symbol: string, label: string, tone: 'success' | 'error', options: AvtiActivityOptions): string {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  const theme = options.theme ?? activeTheme(environment)
  return `  ${styleAvtiTone(symbol, tone, theme, output, environment)} ${styleAvtiTone(label, 'muted', theme, output, environment)}`
}

/** Create one transient activity row with Avti's orbit/pulse motion language. */
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
    if (motion) output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}${styledActivity(frame, label, options)}`)
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
        output.write(`${styledActivity('·', label, options)}\n`)
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
      else if (changed) output.write(`${styledActivity('·', label, options)}\n`)
    },
    setFrames(nextFrames: readonly string[]) {
      if (nextFrames.length === 0) return
      frames = nextFrames
      frameIndex = 0
    },
    succeed(nextLabel = 'Done') {
      if (!active) return
      finishTransient()
      output.write(`${styledCompletion('✓', nextLabel, 'success', options)}\n`)
    },
    fail(nextLabel: string) {
      if (!active) return
      finishTransient()
      output.write(`${styledCompletion('×', nextLabel, 'error', options)}\n`)
    },
    stop() {
      finishTransient()
    },
  }
}

export function formatAvtiAssistantLabel(
  theme: AvtiTheme = activeTheme(process.env),
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const mark = styleAvtiTone('◆', 'accent', theme, output, environment)
  const label = styleAvtiTone('Avti', 'accentBright', theme, output, environment)
  return `${mark} ${label}`
}

export function formatAvtiWelcome(
  theme: AvtiTheme,
  context: { readonly project: string; readonly provider: string; readonly model: string },
  output: { readonly isTTY?: boolean } = process.stdout,
  environment: NodeJS.ProcessEnv = process.env,
): string {
  const brand = styleAvtiTone('AVTI', 'accentBright', theme, output, environment)
  const orbit = styleAvtiTone('◇', 'accent', theme, output, environment)
  const project = styleAvtiTone(context.project, 'text', theme, output, environment)
  const model = styleAvtiTone(`${context.provider}/${context.model}`, 'muted', theme, output, environment)
  const hint = styleAvtiTone('/ commands · ↑↓ navigate · esc closes menus', 'subtle', theme, output, environment)
  return `${orbit} ${brand}\n  ${project}  ${styleAvtiTone('·', 'subtle', theme, output, environment)}  ${model}\n  ${hint}\n\n`
}

export async function renderAvtiIntro(options: AvtiMotionOptions = {}): Promise<void> {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  const frameDelayMs = options.frameDelayMs ?? 80
  const sleep = options.sleep ?? defaultSleep

  if (output.isTTY !== true || environment.CI !== undefined) return
  const theme = activeTheme(environment)
  if (!terminalMotionEnabled(output, environment)) {
    output.write(`${styleAvtiTone('◇ AVTI', 'accentBright', theme, output, environment)}\n\n`)
    return
  }

  for (let index = 0; index < AVTI_INTRO_FRAMES.length; index += 1) {
    const frame = index + 1 === AVTI_INTRO_FRAMES.length
      ? `◇ ${AVTI_INTRO_FRAMES[index]}`
      : AVTI_INTRO_FRAMES[index]!
    output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}${styleAvtiTone(frame, index + 1 === AVTI_INTRO_FRAMES.length ? 'accentBright' : 'accent', theme, output, environment)}`)
    if (index + 1 < AVTI_INTRO_FRAMES.length) await sleep(frameDelayMs)
  }
  await sleep(120)
  output.write('\n\n')
}
