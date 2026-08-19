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
  formatAvtiActivity,
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
  })

  it('disables cursor motion outside an interactive terminal', () => {
    expect(terminalMotionEnabled({ isTTY: false }, {})).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { CI: '1' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { TERM: 'dumb' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, { AVTI_NO_MOTION: '1' })).toBe(false)
    expect(terminalMotionEnabled({ isTTY: true }, {})).toBe(true)
  })

  it('renders a static wordmark for pipes and automation', async () => {
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

  it('owns a concise Avti-facing help surface', () => {
    expect(AVTI_CLI_HELP).toContain('Usage:\n  avti <task>')
    expect(AVTI_CLI_HELP).toContain('avti --profile <name>')
    expect(AVTI_CLI_HELP).not.toContain('Usage: dsh')
  })

  it('resolves help and version locally', () => {
    expect(resolveAvtiInvocation([])).toEqual({ mode: 'help' })
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
