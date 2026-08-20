import React from 'react'
import { getLang, t as tr } from '../i18n.js'
import { pickRandomTip, type Tip } from '../tips.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Box, Text, useAnimationFrame, useTerminalSize } from '../ui.js'
import { getTheme } from '../theme.js'
import { useTheme } from './design-system/ThemeProvider.js'
import { parseRGB } from './Spinner/spinnerUtils.js'
import { renderBigText } from './bigfont.js'
import { stringWidth } from '../ink/stringWidth.js'
import { BRAND, FLASH, ICE, PALE, sweep } from './shimmer.js'
import { STANDARD_FRAME_INDEX, WhaleArt } from './Whale.js'
import { OPENING_SEQUENCE } from './whaleFrames.js'

const VERSION = '0.1.0'
const CORE_MIN_COLUMNS = 64
const FULL_CORE_WIDTH = 46
const CORE_CENTER = 23

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0].toUpperCase() + text.slice(1)
}

/**
 * Avti Quantum Singularity Header
 */
export function LogoV2({
  model,
  effort,
  cwd,
  skipIntro = false,
  tip,
}: {
  model: string
  effort?: string | undefined
  cwd: string
  skipIntro?: boolean
  tip?: Tip
}): React.ReactNode {
  const [step, setStep] = React.useState(skipIntro ? OPENING_SEQUENCE.length : 0)
  const settled = step >= OPENING_SEQUENCE.length

  const [ref, time] = useAnimationFrame(settled ? null : 60)

  React.useEffect(() => {
    if (settled) return
    const timer = setTimeout(() => {
      setStep(s => s + 1)
    }, OPENING_SEQUENCE[step].ms)
    return () => {
      clearTimeout(timer)
    }
  }, [step, settled])

  const [themeName] = useTheme()
  const theme = getTheme(themeName)
  const { columns } = useTerminalSize()

  const wordmarkRGB = parseRGB(theme.claude) ?? { r: 0, g: 245, b: 255 }
  const wordmarkShimmerRGB = parseRGB(theme.claudeShimmer) ?? { r: 168, g: 85, b: 247 }
  const taglineRGB = parseRGB(theme.claudeBlue_FOR_SYSTEM_SPINNER) ?? { r: 0, g: 245, b: 255 }

  const showCore = columns >= CORE_MIN_COLUMNS
  const frameIndex = settled ? STANDARD_FRAME_INDEX : OPENING_SEQUENCE[step].frame
  const t = settled ? 0 : time

  const tagline = 'QUANTUM SINGULARITY AGENTIC PLATFORM'
  const [randomTip] = React.useState<Tip>(() => tip ?? pickRandomTip())
  const welcomePad = showCore
    ? Math.max(0, Math.round(CORE_CENTER - stringWidth(tagline) / 2))
    : 2

  const bigAvti = renderBigText('AVTI', t, wordmarkRGB, wordmarkShimmerRGB, FLASH, 60)
  const bigTerminal = renderBigText('AGENTIC', t, wordmarkShimmerRGB, taglineRGB, FLASH, 60)

  return (
    <Box ref={ref} flexDirection="column" marginTop={1}>
      <Box flexDirection="row" gap={2} width="100%" alignItems="center">
        {showCore && <WhaleArt frameIndex={frameIndex} width={FULL_CORE_WIDTH} />}
        <Box flexDirection="column" flexShrink={1}>
          <Text wrap="truncate-end">
            {sweep('✦ AVTI // TERMINAL', t, wordmarkRGB, wordmarkShimmerRGB, 60)}
            <Text dimColor>{'  v' + VERSION}</Text>
          </Text>
          {bigAvti.map((row, index) => (
            <Text key={`av-${index}`} wrap="truncate-end">
              {row}
            </Text>
          ))}
          {bigTerminal.map((row, index) => (
            <Text key={`tm-${index}`} wrap="truncate-end">
              {row}
            </Text>
          ))}
          <Text wrap="truncate-end">
            <Text bold color="claude">{model}</Text>
            {effort !== undefined && <Text dimColor>{' · ' + capitalize(effort) + ' effort'}</Text>}
          </Text>
          <Text dimColor wrap="truncate-end">
            {cwd}
          </Text>
          <Text wrap="truncate-end">
            <Text dimColor>Tip: </Text>
            {randomTip.en ?? randomTip.zh}
          </Text>
        </Box>
      </Box>
      <Box marginTop={1} paddingLeft={welcomePad}>
        <Text>{sweep(tagline, t, taglineRGB, FLASH, 60)}</Text>
      </Box>
    </Box>
  )
}
