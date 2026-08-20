import { describe, expect, it } from 'vitest'
import { promptAvtiSelect } from '../src/avti-select.ts'
import { AVTI_THEMES } from '../src/avti-theme.ts'

describe('Avti interactive selector', () => {
  it('falls back to default option in non-TTY environments', async () => {
    const output = {
      isTTY: false,
      write() { return true },
    } as unknown as NodeJS.WriteStream

    const input = {
      isTTY: false,
    } as unknown as NodeJS.ReadStream

    const result = await promptAvtiSelect({
      title: 'Test Select',
      options: [
        { label: 'Option A', value: 'a' },
        { label: 'Option B', value: 'b' },
      ],
      defaultIndex: 1,
      theme: AVTI_THEMES[0]!,
      input,
      output,
    })

    expect(result).toBe('b')
  })

  it('returns undefined for empty options list', async () => {
    const result = await promptAvtiSelect({
      title: 'Empty',
      options: [],
      theme: AVTI_THEMES[0]!,
    })
    expect(result).toBeUndefined()
  })
})
