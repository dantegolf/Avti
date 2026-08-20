import { interpolateColor } from './Spinner/spinnerUtils.js'

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Glyph rows are 5 columns wide; `·` is a transparent cell. */
const GLYPHS: Record<string, readonly [string, string, string, string, string]> = {
  A: ['·▄▀▄·', '█···█', '█▀▀▀█', '█···█', '█···█'],
  B: ['█▀▀▀▄', '█···█', '█▀▀▀▄', '█···█', '█▄▄▄▀'],
  C: ['·▄▀▀▀', '█····', '█····', '█····', '·▀▄▄▄'],
  D: ['█▀▀▀▄', '█···█', '█···█', '█···█', '█▄▄▄▀'],
  E: ['█▀▀▀▀', '█····', '█▀▀▀·', '█····', '█▄▄▄▄'],
  F: ['█▀▀▀▀', '█····', '█▀▀▀·', '█····', '█····'],
  G: ['·▄▀▀▀', '█····', '█·▀▀█', '█···█', '·▀▄▄█'],
  H: ['█···█', '█···█', '█▀▀▀█', '█···█', '█···█'],
  I: ['▀█▀', '·█·', '·█·', '·█·', '▄█▄'],
  J: ['···▀█', '····█', '····█', '█···█', '·▀▀▀·'],
  K: ['█···█', '█·█··', '██···', '█·█··', '█···█'],
  L: ['█····', '█····', '█····', '█····', '█▄▄▄▄'],
  M: ['█▀▄▀█', '█·█·█', '█···█', '█···█', '█···█'],
  N: ['█···█', '██··█', '█·█·█', '█··██', '█···█'],
  O: ['·▄▀▄·', '█···█', '█···█', '█···█', '·▀▄▀·'],
  P: ['█▀▀▀▄', '█···█', '█▄▄▄▀', '█····', '█····'],
  Q: ['·▄▀▄·', '█···█', '█···█', '█·▀▄·', '·▀▄▀▄'],
  R: ['█▀▀▀▄', '█···█', '█▄▄▄▀', '█·█··', '█···█'],
  S: ['█▀▀▀▀', '█····', '·▀▀▀▄', '····█', '█▄▄▄▀'],
  T: ['▀███▀', '··█··', '··█··', '··█··', '··█··'],
  U: ['█···█', '█···█', '█···█', '█···█', '·▀▄▀·'],
  V: ['█···█', '█···█', '█···█', '·█·█·', '··█··'],
  W: ['█···█', '█···█', '█·█·█', '█·█·█', '·▀·▀·'],
  X: ['█···█', '·█·█·', '··█··', '·█·█·', '█···█'],
  Y: ['█···█', '·█·█·', '··█··', '··█··', '··█··'],
  Z: ['▀▀▀▀█', '···█·', '··█··', '·█···', '█▄▄▄▄'],
  ' ': ['·····', '·····', '·····', '·····', '·····'],
  '/': ['····█', '···█·', '··█··', '·█···', '█····'],
}

const FALLBACK: readonly [string, string, string, string, string] = [
  '▄▄▄▄▄',
  '█···█',
  '█···█',
  '█···█',
  '▀▀▀▀▀',
]

const SWEEP_WINDOW = 8
const esc = (rgb: Rgb): string => `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`
const RESET = '\x1b[39m'

export function renderBigText(
  text: string,
  time: number,
  from: Rgb,
  to: Rgb,
  flash: Rgb,
  stepMs = 60,
): string[] {
  const chars = text.toUpperCase().split('')
  const glyphList = chars.map(ch => GLYPHS[ch] ?? FALLBACK)

  let totalCols = 0
  const charWidths = glyphList.map(g => {
    const w = g[0]!.length
    totalCols += w + 1
    return w
  })

  const sweepPos = Math.floor(time / stepMs) % (totalCols + SWEEP_WINDOW * 2) - SWEEP_WINDOW

  const lines: string[] = ['', '', '', '', '']

  for (let row = 0; row < 5; row++) {
    let col = 0
    let lineStr = ''
    for (let i = 0; i < glyphList.length; i++) {
      const g = glyphList[i]!
      const gRow = g[row]!
      for (let c = 0; c < gRow.length; c++) {
        const ch = gRow[c]!
        const globalCol = col + c
        const gradT = totalCols > 1 ? globalCol / (totalCols - 1) : 0
        let color = interpolateColor(from, to, gradT)

        const distFromSweep = Math.abs(globalCol - sweepPos)
        if (distFromSweep < SWEEP_WINDOW) {
          const flashT = 1 - distFromSweep / SWEEP_WINDOW
          color = interpolateColor(color, flash, flashT * 0.8)
        }

        if (ch === '·') {
          lineStr += ' '
        } else {
          lineStr += `${esc(color)}${ch}${RESET}`
        }
      }
      lineStr += ' '
      col += charWidths[i]! + 1
    }
    lines[row] = lineStr
  }

  return lines
}
