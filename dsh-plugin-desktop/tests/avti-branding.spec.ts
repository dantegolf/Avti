import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('Avti branding safety contracts', () => {
  it('keeps the upstream DSH Desktop updater disabled', () => {
    const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')

    expect(patch).toMatch(
      /- id: desktop-updates\s+name: dsh-plugin-desktop\/updates\s+disabled: true/u,
    )
  })
})
