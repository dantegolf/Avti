import { describe, expect, it } from 'vitest'
import { AVTI_CLI_HELP, resolveAvtiInvocation } from '../src/avti-cli.ts'

describe('Avti CLI control routing', () => {
  it('keeps product control commands out of the one-shot agent prompt path', () => {
    expect(resolveAvtiInvocation(['status'])).toEqual({ mode: 'control', command: 'status', args: [] })
    expect(resolveAvtiInvocation(['models', 'deepseek-official'])).toEqual({
      mode: 'control', command: 'models', args: ['deepseek-official'],
    })
    expect(resolveAvtiInvocation(['model', 'deepseek-official', 'deepseek-v4-flash'])).toEqual({
      mode: 'control', command: 'model', args: ['deepseek-official', 'deepseek-v4-flash'],
    })
    expect(resolveAvtiInvocation(['sessions'])).toEqual({ mode: 'control', command: 'sessions', args: [] })
    expect(resolveAvtiInvocation(['doctor'])).toEqual({ mode: 'control', command: 'doctor', args: [] })
  })

  it('routes saved-session continuation to the interactive resume path', () => {
    expect(resolveAvtiInvocation(['resume', 'avti-session-123'])).toEqual({
      mode: 'resume',
      sessionId: 'avti-session-123',
    })
    expect(resolveAvtiInvocation(['resume'])).toEqual({ mode: 'help' })
  })

  it('still treats ordinary text as a Harness one-shot task', () => {
    expect(resolveAvtiInvocation(['explain', 'this', 'project'])).toEqual({
      mode: 'harness',
      args: ['--profile', 'headless', 'explain', 'this', 'project'],
      intro: true,
    })
  })

  it('documents the control surface under the Avti brand', () => {
    expect(AVTI_CLI_HELP).toContain('avti resume <session-id>')
    expect(AVTI_CLI_HELP).toContain('avti status')
    expect(AVTI_CLI_HELP).toContain('avti models [provider]')
    expect(AVTI_CLI_HELP).toContain('avti model [provider] <model>')
    expect(AVTI_CLI_HELP).toContain('avti sessions')
    expect(AVTI_CLI_HELP).toContain('avti doctor')
    expect(AVTI_CLI_HELP).not.toContain('Usage: dsh')
  })
})
