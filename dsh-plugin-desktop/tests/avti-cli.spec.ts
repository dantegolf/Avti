import { describe, expect, it, vi } from 'vitest'
import { runAvtiCli, shouldRenderAvtiIntro } from '../src/avti-cli.ts'
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

  it('keeps global Harness launcher output undecorated', () => {
    expect(shouldRenderAvtiIntro([])).toBe(true)
    expect(shouldRenderAvtiIntro(['--help'])).toBe(false)
    expect(shouldRenderAvtiIntro(['-h'])).toBe(false)
    expect(shouldRenderAvtiIntro(['--version'])).toBe(false)
    expect(shouldRenderAvtiIntro(['-V'])).toBe(false)
    expect(shouldRenderAvtiIntro(['plugin', '--help'])).toBe(false)
    expect(shouldRenderAvtiIntro(['--profile', 'headless', 'fix tests'])).toBe(true)
  })

  it('forwards argv untouched and removes only Electron Node mode', async () => {
    const environment = {
      ELECTRON_RUN_AS_NODE: '1',
      DSH_HOME: 'C:\\Avti',
      KEEP: 'value',
    }
    const argv = [process.execPath, '/app/avti.js', '--help']
    const load = vi.fn(async (url: string) => {
      expect(environment).toEqual({ DSH_HOME: 'C:\\Avti', KEEP: 'value' })
      expect(argv).toEqual([process.execPath, '/app/avti.js', '--help'])
      expect(url).toMatch(/\/node_modules\/@deepseek-ai\/dsh\/lib\/bin\.js$/u)
    })

    await runAvtiCli(environment, load, argv)
    expect(load).toHaveBeenCalledOnce()
  })
})
