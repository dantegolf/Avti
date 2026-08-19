import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { Agent, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  currentAvtiSelection,
  handleAvtiSessionControl,
  latestAvtiSessionSelection,
  type AvtiSessionControlContext,
} from '../src/avti-session-controls.ts'

function requestHeader(provider: string, model: string, seq: number): SessionEvent {
  return {
    type: 'request/header',
    seq,
    time: seq,
    data: {
      header: { config: { provider, model } },
      reason: seq === 1 ? 'initial' : 'change',
    },
  } as SessionEvent
}

describe('Avti interactive session controls', () => {
  it('recovers the latest persisted model route for resumed sessions', () => {
    const events = [
      requestHeader('provider-a', 'model-a', 1),
      requestHeader('provider-b', 'model-b', 2),
    ]
    expect(latestAvtiSessionSelection(events)).toEqual({
      provider: 'provider-b',
      model: 'model-b',
    })
  })

  it('prefers the live mutable model selection over persisted and default routes', () => {
    const selection: ModelSelectionRef = {
      current: { provider: 'live-provider', model: 'live-model' },
      assembled: undefined,
    }
    const context = {
      selection,
      defaultSelection: { provider: 'default-provider', model: 'default-model' },
      agent: { session: { events: [requestHeader('old-provider', 'old-model', 1)] } },
    } as unknown as AvtiSessionControlContext

    expect(currentAvtiSelection(context)).toEqual({
      provider: 'live-provider',
      model: 'live-model',
    })
  })

  it('delegates non-Avti slash commands to the native Harness command registry', async () => {
    const execute = vi.fn(async () => ({
      commandId: 'cmd-test',
      result: { kind: 'success', text: 'Compacted' },
    }))
    const get = vi.fn((name: string) => name === 'commands' ? { execute, list: () => [] } : undefined)
    const agent = { session: { events: [] } } as unknown as Agent
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    const context = {
      ctx: { get } as unknown as Context,
      agent,
      selection: { current: { provider: 'p', model: 'm' }, assembled: undefined },
      defaultSelection: { provider: 'p', model: 'm' },
      saveSelection: vi.fn(async () => undefined),
    } satisfies AvtiSessionControlContext

    try {
      await expect(handleAvtiSessionControl('/compact', context)).resolves.toBe('handled')
      expect(execute).toHaveBeenCalledWith(agent, '/compact', expect.any(AbortSignal))
      expect(stdout).toHaveBeenCalledWith(expect.stringContaining('Compacted'))
    } finally {
      stdout.mockRestore()
    }
  })
})
