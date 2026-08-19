import { describe, expect, it, vi } from 'vitest'
import {
  AVTI_ORBIT_FRAMES,
  AVTI_PULSE_FRAMES,
  createAvtiActivity,
} from '../src/avti-terminal-style.ts'
import {
  avtiToolPresentation,
  humanizeAvtiToolName,
} from '../src/avti-tool-presentation.ts'

describe('Avti tool presentation', () => {
  it('maps common Harness tools to user-facing work labels', () => {
    expect(avtiToolPresentation('fs_read')).toEqual({
      active: 'Reading files',
      success: 'Read files',
      failure: 'Could not read files',
    })
    expect(avtiToolPresentation('pwsh')).toEqual({
      active: 'Running command',
      success: 'Ran command',
      failure: 'Command failed',
    })
    expect(avtiToolPresentation('subagent_fork').active).toBe('Delegating work')
  })

  it('keeps unknown tool names readable without pretending to understand them', () => {
    expect(humanizeAvtiToolName('mcp.custom_lookup')).toBe('Mcp Custom Lookup')
    expect(avtiToolPresentation('mcp.custom_lookup')).toEqual({
      active: 'Using Mcp Custom Lookup',
      success: 'Mcp Custom Lookup',
      failure: 'Mcp Custom Lookup failed',
    })
  })

  it('can switch from quiet thinking motion to tool pulse without restarting the event', () => {
    let output = ''
    let tick: (() => void) | undefined
    const activity = createAvtiActivity({
      output: {
        isTTY: true,
        write(chunk: string) {
          output += chunk
          return true
        },
      },
      environment: {},
      frames: AVTI_ORBIT_FRAMES,
      setInterval(callback) {
        tick = callback
        return 1 as unknown as ReturnType<typeof setInterval>
      },
      clearInterval: vi.fn(),
    })

    activity.start('Thinking')
    activity.setFrames(AVTI_PULSE_FRAMES)
    activity.update('Running command')
    tick?.()
    activity.succeed('Ran command')

    expect(output).toContain('◜ Thinking')
    expect(output).toContain('∙····')
    expect(output).toContain('Running command')
    expect(output).toContain('✓ Ran command')
  })
})
