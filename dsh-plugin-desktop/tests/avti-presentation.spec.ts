import { describe, expect, it } from 'vitest'
import { resolveAvtiInvocation } from '../src/avti-cli.ts'
import { runAvtiPresentation } from '../src/avti-presentation.ts'
import {
  renderAvtiCoreLogo,
  renderAvtiHeader,
} from '../src/avti-terminal-style.ts'
import {
  AVTI_THEMES,
  renderAvtiProgressBar,
  renderAvtiSparkline,
  resolveAvtiTheme,
  styleAvtiGradient,
} from '../src/avti-theme.ts'
import {
  avtiToolCategory,
  avtiToolGlyph,
  renderAvtiDiffPreview,
  renderAvtiToolCard,
} from '../src/avti-tool-presentation.ts'

describe('Avti Presentation & Showcase Suite', () => {
  it('resolves demo and presentation CLI invocations', () => {
    expect(resolveAvtiInvocation(['demo'])).toEqual({
      mode: 'presentation',
      fast: false,
    })
    expect(resolveAvtiInvocation(['presentation', '--fast'])).toEqual({
      mode: 'presentation',
      fast: true,
    })
  })

  it('renders high-density ANSI half-block core logo', () => {
    const rows = renderAvtiCoreLogo(AVTI_THEMES[0]!)
    expect(rows).toHaveLength(13)
    expect(rows[0]).toContain('▀')
  })

  it('renders holographic telemetry HUD header', () => {
    const header = renderAvtiHeader({
      provider: 'Antigravity Local Engine',
      model: 'gemini-3.7-flash-high',
      cwd: '/test/workspace',
      gitBranch: 'main',
    })
    expect(header).toContain('QUANTUM SINGULARITY AGENTIC PLATFORM')
    expect(header).toContain('Antigravity Local Engine')
    expect(header).toContain('gemini-3.7-flash-high')
    expect(header).toContain('/test/workspace')
  })

  it('formats segmented context progress bars and sparklines', () => {
    const bar = renderAvtiProgressBar(50, 100, 10, AVTI_THEMES[0]!)
    expect(bar).toContain('█████')
    expect(bar).toContain('░░░░░')

    const sparkline = renderAvtiSparkline([10, 20, 50, 80, 100], AVTI_THEMES[0]!)
    expect(sparkline.length).toBeGreaterThan(0)
  })

  it('interpolates gradient text across RGB colors', () => {
    const gradient = styleAvtiGradient(
      'AVTI',
      { r: 0, g: 245, b: 255 },
      { r: 168, g: 85, b: 247 },
    )
    expect(gradient).toContain('AVTI')
  })

  it('categorizes tools with meaningful glyphs', () => {
    expect(avtiToolCategory('read')).toBe('read')
    expect(avtiToolCategory('apply_patch')).toBe('write')
    expect(avtiToolCategory('bash')).toBe('exec')
    expect(avtiToolCategory('grep')).toBe('search')
    expect(avtiToolGlyph('exec')).toBe('⚡')
    expect(avtiToolGlyph('read')).toBe('⟳')
  })

  it('renders structured tool cards and diff previews', () => {
    const card = renderAvtiToolCard({
      toolName: 'bash',
      details: 'test command details',
      status: 'success',
      durationMs: 12,
    })
    expect(card).toContain('Ran command')
    expect(card).toContain('(12ms)')
    expect(card).toContain('test command details')

    const diff = renderAvtiDiffPreview(
      'file.ts',
      ['const x = 1;'],
      ['const x = 0;'],
    )
    expect(diff).toContain('file.ts')
    expect(diff).toContain('+ const x = 1;')
    expect(diff).toContain('- const x = 0;')
  })

  it('runs the full presentation showcase cleanly into an output stream in fast mode', async () => {
    let captured = ''
    const output = {
      isTTY: true,
      write(chunk: string) {
        captured += chunk
        return true
      },
    } as unknown as NodeJS.WriteStream

    await runAvtiPresentation({
      output,
      theme: resolveAvtiTheme('aurora')!,
      fast: true,
    })

    expect(captured).toContain('QUANTUM SINGULARITY AGENTIC PLATFORM')
    expect(captured).toContain('Extract state ledger lock acquisition hotspots')
    expect(captured).toContain('Executing ast_refactor src/ledger.ts')
    expect(captured).toContain('gemini-3.7-flash-high')
  })
})
