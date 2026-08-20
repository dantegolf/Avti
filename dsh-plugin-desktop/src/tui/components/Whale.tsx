import React from 'react'
import { Box, Text } from '../ui.js'
import { WHALE_FRAMES, type WhaleFrame } from './whaleFrames.js'

/**
 * Avti Quantum Singularity Core:
 * High-density ANSI half-block (▀/▄) artwork in Electric Cyan, Quantum Violet, and White.
 */

type Rgb = readonly [number, number, number]

const PALETTE: Record<string, Rgb | undefined> = {
  C: [0, 245, 255], // Electric Cyan #00F5FF
  V: [168, 85, 247], // Quantum Violet #A855F7
  B: [29, 78, 216], // Deep Space Blue #1D4ED8
  W: [255, 255, 255], // Singularity White
}

const fg = (rgb: Rgb): string => `\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`
const bg = (rgb: Rgb): string => `\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`
const RESET = '\x1b[0m'

export function renderWhaleRows(frame: WhaleFrame): string[] {
  const sprite = frame.rows
  const rows: string[] = []
  for (let r = 0; r < sprite.length; r += 2) {
    const upper = sprite[r]
    const lower = sprite[r + 1] ?? ''
    let out = ''
    let current = ''
    for (let x = 0; x < upper.length; x++) {
      const up = PALETTE[upper[x]]
      const lo = PALETTE[lower[x]]
      let seq: string
      let ch: string
      if (up !== undefined && lo !== undefined) {
        seq = fg(up) + bg(lo)
        ch = '▀'
      } else if (up !== undefined) {
        seq = fg(up)
        ch = '▀'
      } else if (lo !== undefined) {
        seq = fg(lo)
        ch = '▄'
      } else {
        seq = ''
        ch = ' '
      }
      if (seq !== current) {
        out += seq === '' ? RESET : seq
        current = seq
      }
      out += ch
    }
    let row = out.replace(/[ ]+$/, '')
    if (!row.endsWith(RESET)) row += RESET
    rows.push(row)
  }
  return rows
}

const RENDERED: readonly string[][] = WHALE_FRAMES.map(renderWhaleRows)

export const STANDARD_FRAME_INDEX = 0

export function WhaleArt({
  frameIndex = STANDARD_FRAME_INDEX,
  width,
}: {
  frameIndex?: number
  width?: number
}): React.ReactNode {
  const rows = RENDERED[frameIndex] ?? RENDERED[STANDARD_FRAME_INDEX]
  return (
    <Box flexDirection="column" flexShrink={0} width={width}>
      {rows.map((row, index) => (
        <Text key={index} wrap="truncate-end">
          {row}
        </Text>
      ))}
    </Box>
  )
}
