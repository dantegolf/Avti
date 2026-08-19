import { describe, expect, it, vi } from 'vitest'
import {
  AVTI_CLI_HELP,
  clearAvtiElectronRunAsNode,
  resolveAvtiInvocation,
  runAvtiCli,
} from '../src/avti-cli.ts'
import {
  AVTI_INTRO_FRAMES,
  AVTI_ORBIT_FRAMES,
  AVTI_PULSE_FRAMES,
  createAvtiActivity,
  formatAvtiActivity,
  formatAvtiFailure,
  formatAvtiSuccess,
  renderAvtiIntro,
  terminalMotionEnabled,
} from '../src/avti-terminal-style.ts'

describe('Avti CLI presentation', () => {
  it('keeps the motion language small and deterministic', () => {
    expect(AVTI_INTRO_FRAMES).toEqual(['A', 'AV', 'AVT', 'AVTI'])
    expect(AVTI_ORBIT_FRAMES).toEqual(['◜', '◝', '◞', '◟'])
    expect(AVTI_PULSE_FRAMES).toHaveLength(8)
    expect(formatAvtiActivity('◜', 'Reading project')).toBe('  ◜ Reading project')
    expect(formatAvtiSuccess('Done')).toBe('  ✓ Done')
    expect(formatAvtiFailure('Command failed')).toBe('  × Command failed')
  })

  it('disables cursor motion outside an interactive terminal', () => {
    expect(terminalMotionEnabled({ isTTY: false }, {})).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { CI: '1' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { TERM: 'dumb' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { AVTI_NO_MOTION: '1' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, {})).toBe(true)
  })

  it('keeps pipes and automation free of decorative startup output', async () => {
    let output = ''
    await renderAvtiIntro({
      output: {
        isTTY: false,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: {},
    })
    expect(output).toBe('')
  })

  it('renders a static wordmark when motion is disabled in a real terminal', async () => {
    let output = ''
    await renderAvtiIntro({
      output: {
        isTTY: true,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: { AVTI_NO_MOTION: '1' },
    })
    expect(output).toBe('AVTI\n\n')
  })

  it('animates only the short startup reveal on a TTY', async () => {
    let output = ''
    const sleep = vi.fn(async () => undefined)
    await renderAvtiIntro({
      output: {
        isTTY: true,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: {},
      sleep,
    })

    expect(output).toContain('A')
    expect(output).toContain('AVTI')
    expect(output.endsWith('\n\n')).toBe(true)
    expect(sleep).toHaveBeenCalledTimes(3)
  })

  it('owns only transient cursor animation and leaves event meaning to the caller', () => {
    let output = ''
    let tick: (() => void) | undefined
    const clear = vi.fn()
    const activity = createAvtiActivity({
      output: {
        isTTY: true,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: {},
      setInterval(callback) {
        tick = callback
        return 1 as unknown as ReturnType<typeof setInterval>
      },
      clearInterval: clear,
    })

    activity.start('Reading project')
    tick?.()
    activity.update('Running tests')
    activity.succeed('Tests passed')

    expect(output).toContain('◜ Reading project')
    expect(output).toContain('◝ Reading project')
    expect(output).toContain('Running tests')
    expect(output).toContain('✓ Tests passed')
    expect(clear).toHaveBeenCalledOnce()
  })

  it('falls back to stable lines when cursor animation is unavailable', () => {
    let output = ''
    const activity = createAvtiActivity({
      output: {
        isTTY: false,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: {},
    })

    activity.start('Reading project')
    activity.fail('Could not read project')

    expect(output).toBe('  · Reading project\n  × Could not read project\n')
  })

  it('owns a concise Avti-facing help surface', () => {
    expect(AVTI_CLI_HELP).toContain('Usage:\n  avti')
    expect(AVTI_CLI_HELP).toContain('start an interactive session')
    expect(AVTI_CLI_HELP).toContain('avti --profile <name>')
    expect(AVTI_CLI_HELP).not.toContain('Usage: dsh')
  })

  it('resolves interactive, help and version locally', () => {
    expect(resolveAvtiInvocation([])).toEqual({ mode: 'interactive' })
    expect(resolveAvtiInvocation(['--help'])).toEqual({ mode: 'help' })
    expect(resolveAvtiInvocation(['-h'])).toEqual({ mode: 'help' })
    expect(resolveAvtiInvocation(['--version'])).toEqual({ mode: 'version' })
    expect(resolveAvtiInvocation(['-V'])).toEqual({ mode: 'version' })
  })

  it('maps ordinary Avti tasks onto the existing headless Harness profile', () => {
    expect(resolveAvtiInvocation(['fix tests'])).toEqual({
      mode: 'harness',
      args: ['--profile', 'headless', 'fix tests'],
      intro: true,
    })
    expect(resolveAvtiInvocation(['fix', 'tests'])).toEqual({
      mode: 'harness',
      args: ['--profile', 'headless', 'fix', 'tests'],
      intro: true,
    })
  })

  it('passes explicit Harness launcher modes through unchanged', () => {
    expect(resolveAvtiInvocation(['web'])).toEqual({
      mode: 'harness',
      args: ['web'],
      intro: false,
    })
    expect(resolveAvtiInvocation(['plugin', '--profile', 'desktop', 'list'])).toEqual({
      mode: 'harness',
      args: ['plugin', '--profile', 'desktop', 'list'],
      intro: false,
    })
    expect(resolveAvtiInvocation(['--profile', 'headless', 'fix tests'])).toEqual({
      mode: 'harness',
      args: ['--profile', 'headless', 'fix tests'],
      intro: true,
    })
    expect(resolveAvtiInvocation(['--profile=web', '--help'])).toEqual({
      mode: 'harness',
      args: ['--profile=web', '--help'],
      intro: false,
    })
  })

  it('removes every Windows casing of Electron Node mode', () => {
    const environment = {
      ELECTRON_RUN_AS_NODE: '1',
      electron_run_as_node: 'inherited',
      Path: 'C:\\Windows',
    }

    clearAvtiElectronRunAsNode(environment)

    expect(environment).toEqual({ Path: 'C:\\Windows' })
  })

  it('loads the existing Harness entry without changing explicit profile arguments', async () => {
    const environment = {
      ELECTRON_RUN_AS_NODE: '1',
      KEEP: 'value',
    }
    const argv = [process.execPath, '/app/avti.js', '--profile', 'web']
    const load = vi.fn(async (url: string) => {
      expect(environment).toEqual({ KEEP: 'value' })
      expect(argv).toEqual([process.execPath, '/app/avti.js', '--profile', 'web'])
      expect(url).toMatch(/\/node_modules\/@deepseek-ai\/dsh\/lib\/bin\.js$/u)
    })

    await runAvtiCli(environment, load, argv)
    expect(load).toHaveBeenCalledOnce()
  })
})
