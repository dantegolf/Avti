/**
 * Avti Interactive Presentation & Live Demo Showcase Engine
 *
 * Designed specifically for high-impact live presentations, stage demos,
 * and architectural walkthroughs of the Avti agentic CLI platform.
 */

import {
  AVTI_THEMES,
  bgRgb,
  BOLD,
  DIM,
  fgRgb,
  ITALIC,
  RESET,
  styleAvtiAccent,
  styleAvtiGradient,
  type AvtiTheme,
} from './avti-theme.ts'
import {
  AVTI_ACCELERATOR_FRAMES,
  AVTI_QUANTUM_FRAMES,
  createAvtiActivity,
  renderAvtiHeader,
  renderAvtiLiveWorkingLine,
  renderAvtiStatusFooter,
  type AvtiActivity,
} from './avti-terminal-style.ts'
import {
  renderAvtiDiffPreview,
  renderAvtiToolCard,
} from './avti-tool-presentation.ts'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface AvtiPresentationOptions {
  readonly output?: NodeJS.WriteStream
  readonly theme?: AvtiTheme
  readonly interactive?: boolean
  readonly fast?: boolean
}

/**
 * Execute the full Avti Autonomous Agent Demonstration Suite matching dsh-TUI/splash.png & working-line.png.
 */
export async function runAvtiPresentation(options: AvtiPresentationOptions = {}): Promise<void> {
  const output = options.output ?? process.stdout
  const theme = options.theme ?? AVTI_THEMES[0]!
  const delayMultiplier = options.fast ? 0.3 : 1.0

  const pace = (ms: number) => sleep(Math.round(ms * delayMultiplier))
  const border = theme.borderAnsi || DIM

  output.write('\x1b[2J\x1b[H') // Clear screen and jump to top

  // ─────────────────────────────────────────────────────────────
  // ACT 1: QUANTUM CORE BOOT & TELEMETRY LOCK (SPLASH SCREEN)
  // ─────────────────────────────────────────────────────────────
  output.write(renderAvtiHeader({
    theme,
    provider: 'Antigravity Local Engine',
    model: 'gemini-3.7-flash-high',
    cwd: process.cwd(),
    gitBranch: 'feat/avti-cli',
    version: '0.1.0',
    tip: 'Presentation Mode: Live autonomous agent loop & high-throughput telemetry showcase.',
  }))
  await pace(700)

  // ─────────────────────────────────────────────────────────────
  // ACT 2: USER PROMPT WITH HIGHLIGHT STRIP & THINKING BLOCK
  // ─────────────────────────────────────────────────────────────
  const userPromptText = 'Optimize high-concurrency event stream, eliminate race conditions in state ledger, and verify test assertions'
  const userStrip = `${bgRgb(30, 41, 59)}${fgRgb(248, 250, 252)} › ${userPromptText.padEnd(94)}${RESET}\n\n`
  output.write(userStrip)
  await pace(500)

  const activity = createAvtiActivity({
    output,
    frames: AVTI_QUANTUM_FRAMES,
    theme,
    intervalMs: 60,
  })

  activity.start('Thinking · 4.2s (ctrl+o to expand)')
  await pace(800)
  activity.update('Synthesizing AST graph & checking concurrent invariant rules')
  await pace(700)
  activity.succeed('Thinking complete · 4.2s (ctrl+o to expand)')
  output.write('\n')

  // Assistant response greeting & plan
  output.write(`  ● ${BOLD}Identified race conditions in event ledger.${RESET} Formulating refactor plan:\n\n`)
  await pace(400)

  // ─────────────────────────────────────────────────────────────
  // ACT 3: GOAL / TODO CHECKLIST PANEL (MATCHING working-line.png)
  // ─────────────────────────────────────────────────────────────
  const todoPanel = [
    `  ${border}┌─${RESET} ${theme.successAnsi}●${RESET} ${BOLD}Extract state ledger lock acquisition hotspots${RESET} ${DIM}(completed in 4ms)${RESET}`,
    `  ${border}│${RESET}  ${theme.accentAnsi}○${RESET} ${BOLD}Implement double-buffered lockless atomic ring buffer${RESET} ${DIM}(in progress)${RESET}`,
    `  ${border}│${RESET}  ${DIM}○ Run full concurrent fuzzing test suite (vitest)${RESET}`,
    `  ${border}└──────────────────────────────────────────────────────────────────────────────────────────────${RESET}`,
    '',
  ].join('\n')
  output.write(todoPanel)
  await pace(600)

  // ─────────────────────────────────────────────────────────────
  // ACT 4: LIVE WORKING LINE (ACTIVITY BAR)
  // ─────────────────────────────────────────────────────────────
  const workingLine = renderAvtiLiveWorkingLine({
    actionText: 'Executing ast_refactor src/ledger.ts',
    elapsedSeconds: 1.4,
    tokensCount: 1420,
    category: 'ts',
    theme,
  })
  output.write(workingLine + '\n\n')
  await pace(700)

  // Tool 1: Grep search card
  output.write(renderAvtiToolCard({
    toolName: 'grep',
    details: 'Pattern: `ledger\\.writeLock\\.acquire`\nMatches: 3 callsites identified across 2 files\nLatency: 4.2ms',
    status: 'success',
    durationMs: 4,
    theme,
  }) + '\n\n')
  await pace(600)

  // Tool 2: Code modification with Diff
  const diffOutput = renderAvtiDiffPreview(
    'src/ledger.ts:84',
    [
      'const ringBuffer = new AtomicRingBuffer<SessionEvent>(CAPACITY);',
      'export function appendEvent(event: SessionEvent): void {',
      '  ringBuffer.offer(event); // Lock-free O(1) concurrent push',
      '}',
    ],
    [
      'const mutex = new AsyncMutex();',
      'export async function appendEvent(event: SessionEvent): Promise<void> {',
      '  await mutex.acquire(); // Contention bottleneck',
      '}',
    ],
    theme,
  )
  output.write(diffOutput + '\n\n')
  await pace(800)

  // Tool 3: Test execution
  output.write(renderAvtiToolCard({
    toolName: 'bash',
    details: '$ corepack yarn test tests/ledger.spec.ts\n✓ Concurrency under 10k parallel producers (0 dropped frames)\n✓ Memory throughput: 1.48 GB/s (12.8x speedup)',
    status: 'success',
    durationMs: 18,
    theme,
  }) + '\n\n')
  await pace(700)

  // ─────────────────────────────────────────────────────────────
  // ACT 5: THREE-ROW STATUS FOOTER HUD (MATCHING splash.png)
  // ─────────────────────────────────────────────────────────────
  const statusFooter = renderAvtiStatusFooter({
    theme,
    model: 'gemini-3.7-flash-high',
    effort: 'max',
    tps: 95.2,
    inputTokens: 14200,
    outputTokens: 2200,
    cacheHitPct: 99.4,
    gitBranch: 'feat/avti-cli',
    sessionCwd: 'Avti',
    sessionTitle: 'event-stream-opt',
    contextUsed: 14200,
    contextTotal: 1000000,
    statusText: '✓ Verified',
  })
  output.write(statusFooter)
}
