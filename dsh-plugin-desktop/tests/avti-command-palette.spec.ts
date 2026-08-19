import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import {
  createAvtiSlashCompleter,
  filterAvtiCommandSuggestions,
  listAvtiCommandSuggestions,
  nextAvtiSlashPaletteVisibility,
} from '../src/avti-command-palette.ts'
import {
  AVTI_ANTIGRAVITY_MODELS,
  avtiAntigravityPatch,
  configureAvtiAntigravityEnvironment,
  withAvtiAntigravityPatch,
} from '../src/avti-antigravity.ts'

describe('Avti slash command palette', () => {
  it('filters built-in commands live from a slash prefix', () => {
    const suggestions = listAvtiCommandSuggestions(
      { get: vi.fn(() => undefined) } as unknown as Context,
      {} as Agent,
    )

    expect(filterAvtiCommandSuggestions('/', suggestions).map(item => item.command)).toContain('/model')
    expect(filterAvtiCommandSuggestions('/mo', suggestions).map(item => item.command)).toEqual([
      '/models',
      '/model',
    ])
    expect(filterAvtiCommandSuggestions('/model ', suggestions)).toEqual([])
    expect(filterAvtiCommandSuggestions('hello', suggestions)).toEqual([])
  })

  it('bounds the root slash menu instead of dumping the entire command registry', () => {
    const suggestions = Array.from({ length: 20 }, (_, index) => ({
      command: `/command-${index}`,
      description: `command ${index}`,
      source: 'harness' as const,
    }))

    expect(filterAvtiCommandSuggestions('/', suggestions)).toHaveLength(7)
    expect(filterAvtiCommandSuggestions('/command-1', suggestions, Number.POSITIVE_INFINITY)).toHaveLength(11)
  })

  it('keeps Escape dismissal sticky until slash-command mode is left', () => {
    let visibility = { dismissed: false }

    visibility = nextAvtiSlashPaletteVisibility(visibility, '/', 'escape')
    expect(visibility).toEqual({ dismissed: true })

    visibility = nextAvtiSlashPaletteVisibility(visibility, '/mo', 'm')
    expect(visibility).toEqual({ dismissed: true })

    visibility = nextAvtiSlashPaletteVisibility(visibility, '', 'backspace')
    expect(visibility).toEqual({ dismissed: false })

    visibility = nextAvtiSlashPaletteVisibility(visibility, '/', '/')
    expect(visibility).toEqual({ dismissed: false })
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
