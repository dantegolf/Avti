/** Minimal Avti terminal presentation primitives for the Harness CLI wrapper. */

import type { WriteStream } from 'node:tty'

/** Quiet orbital motion used for transient Avti activity states. */
export const AVTI_ORBIT_FRAMES = ['◜', '◝', '◞', '◟'] as const

/** Horizontal pulse for longer-running tool activity. */
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

/** One-shot startup reveal. It is intentionally short and disappears into the native CLI. */
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

const ESC = '\u001b['
const ERASE_LINE = `${ESC}2K`
const CURSOR_COLUMN_ZERO = '\r'

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/** Keep automation, pipes, dumb terminals, and explicit opt-outs free of cursor animation. */
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

/** Format a single transient activity line without changing Harness event semantics. */
export function formatAvtiActivity(frame: string, label: string): string {
  return `  ${frame} ${label}`
}

/** Format stable completion states used by future terminal presentation adapters. */
export function formatAvtiSuccess(label: string): string {
  return `  ✓ ${label}`
}

/**
 * Render the tiny Avti startup reveal.
 * Non-interactive output receives a single static wordmark and no control sequences.
 */
export async function renderAvtiIntro(options: AvtiMotionOptions = {}): Promise<void> {
  const output = options.output ?? process.stdout
  const environment = options.environment ?? process.env
  const frameDelayMs = options.frameDelayMs ?? 55
  const sleep = options.sleep ?? defaultSleep

  if (!terminalMotionEnabled(output, environment)) {
    output.write('AVTI\n\n')
    return
  }

  for (let index = 0; index < AVTI_INTRO_FRAMES.length; index += 1) {
    output.write(`${ERASE_LINE}${CURSOR_COLUMN_ZERO}${AVTI_INTRO_FRAMES[index]}`)
    if (index + 1 < AVTI_INTRO_FRAMES.length) await sleep(frameDelayMs)
  }
  output.write('\n\n')
}
