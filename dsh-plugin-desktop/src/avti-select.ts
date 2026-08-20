/**
 * Interactive Arrow-Key Terminal Selector for Avti CLI.
 * Provides keyboard-driven (↑/↓/Enter/Esc) menus for themes, models, sessions, and approvals.
 */

import { emitKeypressEvents } from 'node:readline'
import {
  BOLD,
  DIM,
  RESET,
  styleAvtiSelection,
  styleAvtiTone,
  type AvtiTheme,
  type AvtiTone,
} from './avti-theme.ts'

export interface AvtiSelectOption<T = string> {
  readonly label: string
  readonly value: T
  readonly description?: string
  readonly hint?: string
}

export interface AvtiSelectOptions<T = string> {
  readonly title: string
  readonly options: readonly AvtiSelectOption<T>[]
  readonly defaultIndex?: number
  readonly theme: AvtiTheme
  readonly input?: NodeJS.ReadStream
  readonly output?: NodeJS.WriteStream
  readonly footerHint?: string
}

const ESC = '\x1b['
const ERASE_LINE = '\x1b[2K'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'

function oneLine(value: string): string {
  return value.replace(/[\r\n\t]+/gu, ' ').replace(/\s{2,}/gu, ' ').trim()
}

function fitText(value: string, width: number): string {
  if (width <= 0) return ''
  const normalized = oneLine(value)
  if (normalized.length <= width) return normalized
  if (width === 1) return '…'
  return `${normalized.slice(0, width - 1)}…`
}

function styled(text: string, tone: AvtiTone, theme: AvtiTheme, output: NodeJS.WriteStream): string {
  return styleAvtiTone(text, tone, theme, output)
}

/**
 * Prompt user with an interactive arrow-key navigable menu.
 * Returns the selected value, or undefined if dismissed with Esc/Ctrl+C.
 */
export async function promptAvtiSelect<T = string>(
  options: AvtiSelectOptions<T>,
): Promise<T | undefined> {
  const input = options.input ?? process.stdin
  const output = options.output ?? process.stdout
  const theme = options.theme
  const items = options.options
  if (items.length === 0) return undefined

  if (input.isTTY !== true || output.isTTY !== true) {
    const fallback = items[options.defaultIndex ?? 0]
    return fallback?.value
  }

  let selectedIndex = Math.max(0, Math.min(options.defaultIndex ?? 0, items.length - 1))
  let renderedLines = 0

  const renderMenu = (): void => {
    const columns = Math.max(20, (output.columns ?? 80) - 2)
    const lines: string[] = []

    // Section title
    lines.push(`${styled('╭─', 'subtle', theme, output)} ${styled(options.title, 'accent', theme, output)}`)

    // Options
    const maxLabelLen = Math.max(10, ...items.map(i => i.label.length))
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      const isSelected = i === selectedIndex
      const paddedLabel = item.label.padEnd(maxLabelLen)
      const desc = item.description ? `  ${item.description}` : ''
      const hint = item.hint ? ` (${item.hint})` : ''
      const content = fitText(`${paddedLabel}${desc}${hint}`, columns - 6)

      if (isSelected) {
        lines.push(`  ${styleAvtiSelection(`› ${content}`, theme, output)}`)
      } else {
        lines.push(`  ${styled('│', 'subtle', theme, output)}  ${styled(content, 'muted', theme, output)}`)
      }
    }

    // Section end & hint
    const hintText = options.footerHint ?? '↑↓ navigate · Enter select · Esc cancel'
    lines.push(`${styled('╰─', 'subtle', theme, output)} ${styled(hintText, 'subtle', theme, output)}`)

    // Clear previous render
    if (renderedLines > 0) {
      output.write(`${ESC}${renderedLines}A\r`)
    }

    output.write(HIDE_CURSOR)
    for (const line of lines) {
      output.write(`${ERASE_LINE}${line}\n`)
    }
    output.write(SHOW_CURSOR)
    renderedLines = lines.length
  }

  return new Promise<T | undefined>((resolve) => {
    const wasRaw = input.isRaw
    input.setRawMode?.(true)
    input.resume()
    emitKeypressEvents(input)

    const cleanup = (): void => {
      input.off('keypress', onKeypress)
      if (wasRaw === false) input.setRawMode?.(false)
      if (output.isTTY === true) {
        output.write(SHOW_CURSOR)
        if (renderedLines > 0) {
          output.write(`${ESC}${renderedLines}A\r`)
          for (let i = 0; i < renderedLines; i++) {
            output.write(`${ERASE_LINE}${ESC}1B\r`)
          }
          output.write(`${ESC}${renderedLines}A\r`)
        }
      }
    }

    const onKeypress = (_str: string, key: { name?: string; ctrl?: boolean }): void => {
      if (key.ctrl && key.name === 'c') {
        cleanup()
        resolve(undefined)
        return
      }

      if (key.name === 'escape' || key.name === 'q') {
        cleanup()
        resolve(undefined)
        return
      }

      if (key.name === 'up' || key.name === 'k') {
        selectedIndex = (selectedIndex - 1 + items.length) % items.length
        renderMenu()
        return
      }

      if (key.name === 'down' || key.name === 'j') {
        selectedIndex = (selectedIndex + 1) % items.length
        renderMenu()
        return
      }

      if (key.name === 'return' || key.name === 'enter' || key.name === 'space') {
        const choice = items[selectedIndex]?.value
        cleanup()
        resolve(choice)
        return
      }
    }

    input.on('keypress', onKeypress)
    renderMenu()
  })
}
