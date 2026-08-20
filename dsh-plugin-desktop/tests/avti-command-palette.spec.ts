import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  createAvtiSlashCompleter,
  filterAvtiCommandSuggestions,
  layoutAvtiSlashPalette,
  listAvtiCommandSuggestions,
  nextAvtiSlashPaletteState,
} from '../src/avti-command-palette.ts'
import {
  AVTI_ANTIGRAVITY_MODELS,
  avtiAntigravityPatch,
  configureAvtiAntigravityEnvironment,
  withAvtiAntigravityPatch,
} from '../src/avti-antigravity.ts'

describe('Avti slash command shelf', () => {
  it('filters built-in commands live from a slash prefix', () => {
    const suggestions = listAvtiCommandSuggestions(
      { get: vi.fn(() => undefined) } as unknown as Context,
      {} as Agent,
    )

    expect(filterAvtiCommandSuggestions('/', suggestions).map(item => item.command)).toContain('/model')
    expect(filterAvtiCommandSuggestions('/mo', suggestions).map(item => item.command)).toEqual([
      '/model',
      '/models',
    ])
    expect(filterAvtiCommandSuggestions('/model ', suggestions)).toEqual([])
    expect(filterAvtiCommandSuggestions('hello', suggestions)).toEqual([])
  })

  it('bounds bare slash more aggressively without limiting explicit completion', () => {
    const suggestions = Array.from({ length: 20 }, (_, index) => ({
      command: `/command-${index}`,
      description: `command ${index}`,
      source: 'harness' as const,
    }))

    expect(filterAvtiCommandSuggestions('/', suggestions)).toHaveLength(5)
    expect(filterAvtiCommandSuggestions('/command-1', suggestions, Number.POSITIVE_INFINITY)).toHaveLength(11)
  })

  it('keeps every painted row within the terminal width and reports hidden matches', () => {
    const suggestions = Array.from({ length: 12 }, (_, index) => ({
      command: `/plugin-command-${index}`,
      hint: index === 0 ? '[a-very-long-argument-placeholder]' : undefined,
      description: `Long plugin description ${index} that would otherwise wrap across physical terminal rows\nwith an accidental newline`,
      source: 'harness' as const,
    }))

    const layout = layoutAvtiSlashPalette(
      '/plugin',
      suggestions,
      { dismissed: false, selectedIndex: 0 },
      52,
    )

    expect(layout.rows).toHaveLength(8)
    expect(layout.hiddenMatches).toBe(4)
    expect(layout.footer).toContain('+4 more')
    for (const row of layout.rows) {
      const visible = `  ${row.selected ? '›' : ' '} ${row.command}${row.description === '' ? '' : `  ${row.description}`}`
      expect(visible.length).toBeLessThanOrEqual(51)
      expect(visible).not.toContain('\n')
    }
    expect(layout.footer.length).toBeLessThanOrEqual(51)
  })

  it('does not paint a shelf in a terminal too narrow for safe one-line rows', () => {
    const suggestions = [
      { command: '/model', description: 'model', source: 'avti' as const },
    ]
    expect(layoutAvtiSlashPalette('/', suggestions, { dismissed: false, selectedIndex: 0 }, 26).rows).toEqual([])
  })

  it('supports sticky Escape dismissal and arrow selection state', () => {
    let state = { dismissed: false, selectedIndex: 0 }

    state = nextAvtiSlashPaletteState(state, '/', 'down', 3)
    expect(state).toEqual({ dismissed: false, selectedIndex: 1 })
    state = nextAvtiSlashPaletteState(state, '/', 'up', 3)
    expect(state).toEqual({ dismissed: false, selectedIndex: 0 })
    state = nextAvtiSlashPaletteState(state, '/', 'up', 3)
    expect(state).toEqual({ dismissed: false, selectedIndex: 2 })

    state = nextAvtiSlashPaletteState(state, '/', 'escape', 3)
    expect(state).toEqual({ dismissed: true, selectedIndex: 2 })
    state = nextAvtiSlashPaletteState(state, '/mo', 'down', 2)
    expect(state).toEqual({ dismissed: true, selectedIndex: 2 })

    state = nextAvtiSlashPaletteState(state, '', 'backspace', 0)
    expect(state).toEqual({ dismissed: false, selectedIndex: 0 })
    state = nextAvtiSlashPaletteState(state, '/', '/', 3)
    expect(state).toEqual({ dismissed: false, selectedIndex: 0 })
  })

  it('merges native Harness plugin commands without duplicating Avti commands', () => {
    const list = vi.fn(() => [
      { name: 'compact', description: 'Compact the current conversation' },
      { name: 'model', description: 'Native duplicate that Avti owns' },
    ])
    const ctx = {
      get: vi.fn((name: string) => name === 'commands' ? { list } : undefined),
    } as unknown as Context
    const agent = {} as Agent

    const suggestions = listAvtiCommandSuggestions(ctx, agent)
    expect(suggestions.filter(item => item.command === '/model')).toHaveLength(1)
    expect(suggestions).toContainEqual(expect.objectContaining({
      command: '/compact',
      source: 'harness',
    }))
  })

  it('uses the same catalog for readline Tab completion', () => {
    const suggestions = [
      { command: '/model', description: 'model', source: 'avti' as const },
      { command: '/models', description: 'models', source: 'avti' as const },
      { command: '/status', description: 'status', source: 'avti' as const },
    ]
    const complete = createAvtiSlashCompleter(() => suggestions)

    expect(complete('/mo')).toEqual([['/model', '/models'], '/mo'])
    expect(complete('hello')).toEqual([[], 'hello'])
  })
})

describe('Avti Antigravity provider preset', () => {
  it('tracks the ClaudeGravity model catalog and emits a hand-declared Anthropic route', () => {
    const patch = avtiAntigravityPatch()
    expect(AVTI_ANTIGRAVITY_MODELS).toHaveLength(22)
    expect(patch).toContain('antigravity:')
    expect(patch).toContain('api: anthropic-messages')
    expect(patch).toContain('baseURL: http://127.0.0.1:8080')
    expect(patch).toContain('          - id: gemini-3.7-flash-high')
    expect(patch).toContain('            maxTokens: 65536')
    expect(patch).toContain('          - id: gemini-2.5-pro')
    expect(patch).toContain('            contextWindow: 2000000')
  })

  it('defaults only the local proxy key and preserves explicit configuration', () => {
    const empty: NodeJS.ProcessEnv = {}
    configureAvtiAntigravityEnvironment(empty)
    expect(empty.ANTIGRAVITY_API_KEY).toBe('antigravity')

    const explicit: NodeJS.ProcessEnv = { ANTIGRAVITY_API_KEY: 'custom-local-key' }
    configureAvtiAntigravityEnvironment(explicit)
    expect(explicit.ANTIGRAVITY_API_KEY).toBe('custom-local-key')
  })

  it('adds the provider overlay to Harness invocations once', () => {
    expect(withAvtiAntigravityPatch(['--profile', 'headless'], '/tmp/provider.yml')).toEqual([
      '--patch',
      '/tmp/provider.yml',
      '--profile',
      'headless',
    ])
    expect(withAvtiAntigravityPatch([
      '--patch',
      '/tmp/provider.yml',
      '--profile',
      'headless',
    ], '/tmp/provider.yml')).toEqual([
      '--patch',
      '/tmp/provider.yml',
      '--profile',
      'headless',
    ])
  })
})
