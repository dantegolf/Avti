/**
 * Avti Quantum Singularity Core Frames
 * Multi-phase animated sprite frames for Avti TUI startup sequence.
 */

export interface WhaleFrame {
  readonly id: string
  readonly rows: readonly string[]
}

const FRAME_CORE_SETTLED: WhaleFrame = {
  id: 'settled',
  rows: [
    '........CCCC........VVVVVV........CCCC........',
    '......CCCCCC......VVVVVVVVVV......CCCCCC......',
    '....CCCCCCCC....VVVVVVVVVVVVVV....CCCCCCCC....',
    '..CCCCCCCCCC..VVVVVVVVWWVVVVVVVV..CCCCCCCCCC..',
    '.CCCCCCCCCCC.VVVVVVVWWWWWWVVVVVVV.CCCCCCCCCCC.',
    'CCCCCCCCCCCC.VVVVVVWWWWWWWWVVVVVV.CCCCCCCCCCCC',
    'CCCCCCCCCCCC.VVVVVVWWWWWWWWVVVVVV.CCCCCCCCCCCC',
    '.CCCCCCCCCCC.VVVVVVVWWWWWWVVVVVVV.CCCCCCCCCCC.',
    '..CCCCCCCCCC..VVVVVVVVWWVVVVVVVV..CCCCCCCCCC..',
    '....CCCCCCCC....VVVVVVVVVVVVVV....CCCCCCCC....',
    '......CCCCCC......VVVVVVVVVV......CCCCCC......',
    '........CCCC........VVVVVV........CCCC........',
  ],
}

const FRAME_PULSE_1: WhaleFrame = {
  id: 'pulse_1',
  rows: [
    '....................VVVV......................',
    '..................VVVVVVVV....................',
    '................VVVVWWWWVVVV..................',
    '...............VVVVWWWWWWVVVV.................',
    '...............VVVVWWWWWWVVVV.................',
    '................VVVVWWWWVVVV..................',
    '..................VVVVVVVV....................',
    '....................VVVV......................',
    '..............................................',
    '..............................................',
    '..............................................',
    '..............................................',
  ],
}

const FRAME_PULSE_2: WhaleFrame = {
  id: 'pulse_2',
  rows: [
    '........CC..........VVVVVV..........CC........',
    '......CCCC........VVVVVVVVVV........CCCC......',
    '....CCCCCC......VVVVVVWWVVVVVV......CCCCCC....',
    '..CCCCCCCC....VVVVVVWWWWWWVVVVVV....CCCCCCCC..',
    '..CCCCCCCC....VVVVVVWWWWWWVVVVVV....CCCCCCCC..',
    '....CCCCCC......VVVVVVWWVVVVVV......CCCCCC....',
    '......CCCC........VVVVVVVVVV........CCCC......',
    '........CC..........VVVVVV..........CC........',
    '..............................................',
    '..............................................',
    '..............................................',
    '..............................................',
  ],
}

export const WHALE_FRAMES: readonly WhaleFrame[] = [
  FRAME_CORE_SETTLED,
  FRAME_PULSE_1,
  FRAME_PULSE_2,
]

export const OPENING_SEQUENCE: readonly { readonly frame: number; readonly ms: number }[] = [
  { frame: 1, ms: 140 },
  { frame: 2, ms: 160 },
  { frame: 0, ms: 220 },
]
