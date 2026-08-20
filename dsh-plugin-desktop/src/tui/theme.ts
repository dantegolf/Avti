/**
 * Avti Design System & Theme Engine — "Quantum Aurora & Obsidian"
 *
 * Full truecolor, 256-color, and ANSI-adapted theme system for Avti TUI.
 */

export type Theme = {
  autoAccept: string
  bashBorder: string
  claude: string
  toolNameMutate: string
  toolNameExec: string
  claudeShimmer: string
  claudeBlue_FOR_SYSTEM_SPINNER: string
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: string
  permission: string
  permissionShimmer: string
  planMode: string
  ide: string
  promptBorder: string
  promptBorderShimmer: string
  text: string
  inverseText: string
  inactive: string
  inactiveShimmer: string
  subtle: string
  suggestion: string
  remember: string
  background: string
  // Semantic colors
  success: string
  error: string
  warning: string
  merged: string
  warningShimmer: string
  // Diff colors
  diffAdded: string
  diffRemoved: string
  diffAddedDimmed: string
  diffRemovedDimmed: string
  diffAddedWord: string
  diffRemovedWord: string
  // Tool card surfaces
  toolCardBackground: string
  toolCardBackgroundDim: string
  // Tool status dots
  toolDotExec: string
  toolDotRead: string
  toolDotWrite: string
  toolDotWeb: string
  toolDotTask: string
  // Diff syntax highlighting
  syntaxKeyword: string
  syntaxString: string
  syntaxComment: string
  syntaxNumber: string
  syntaxFunction: string
  syntaxType: string
  syntaxVariable: string
  syntaxOperator: string
  syntaxPunctuation: string
  syntaxConstant: string
  // Agent colors
  red_FOR_SUBAGENTS_ONLY: string
  blue_FOR_SUBAGENTS_ONLY: string
  green_FOR_SUBAGENTS_ONLY: string
  yellow_FOR_SUBAGENTS_ONLY: string
  purple_FOR_SUBAGENTS_ONLY: string
  orange_FOR_SUBAGENTS_ONLY: string
  pink_FOR_SUBAGENTS_ONLY: string
  cyan_FOR_SUBAGENTS_ONLY: string
  // Chrome colors
  professionalBlue: string
  chromeYellow: string
  // TUI V2 colors
  clawd_body: string
  clawd_background: string
  userMessageBackground: string
  userMessageBackgroundHover: string
  messageActionsBackground: string
  selectionBg: string
  bashMessageBackgroundColor: string
  memoryBackgroundColor: string
  rate_limit_fill: string
  rate_limit_empty: string
  fastMode: string
  fastModeShimmer: string
  briefLabelYou: string
  briefLabelClaude: string
  rainbow_red: string
  rainbow_orange: string
  rainbow_yellow: string
  rainbow_green: string
  rainbow_blue: string
  rainbow_indigo: string
  rainbow_violet: string
  rainbow_red_shimmer: string
  rainbow_orange_shimmer: string
  rainbow_yellow_shimmer: string
  rainbow_green_shimmer: string
  rainbow_blue_shimmer: string
  rainbow_indigo_shimmer: string
  rainbow_violet_shimmer: string
}

export const THEME_NAMES = [
  'aurora',
  'antigravity',
  'solar-amber',
  'cyber-matrix',
  'ice-slate',
  'clean-mono',
  'dark',
  'dark-ansi',
  'light',
] as const

export const AUTO_THEME_NAME = 'auto'

let autoBase: 'aurora' | 'light' = 'aurora'

export function setAutoThemeBase(name: 'aurora' | 'light'): void {
  autoBase = name
}

export function getAutoThemeBase(): 'aurora' | 'light' {
  return autoBase
}

export type ThemeName = string

const rgb = (hex: string): string => {
  const n = parseInt(hex.slice(1), 16)
  return `rgb(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255})`
}

/**
 * Avti Signature Theme: Aurora (Electric Cyan & Quantum Purple on Obsidian)
 */
const auroraTheme: Theme = {
  autoAccept: rgb('#A855F7'),
  bashBorder: rgb('#00F5FF'),
  claude: rgb('#00F5FF'), // Electric Cyan primary accent
  toolNameMutate: rgb('#F59E0B'),
  toolNameExec: rgb('#00F5FF'),
  claudeShimmer: rgb('#A855F7'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#00F5FF'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#A855F7'),
  permission: rgb('#00F5FF'),
  permissionShimmer: rgb('#67E8F9'),
  planMode: rgb('#10B981'),
  ide: rgb('#3B82F6'),
  promptBorder: rgb('#334155'),
  promptBorderShimmer: rgb('#00F5FF'),
  text: rgb('#F8FAFC'),
  inverseText: rgb('#0F172A'),
  inactive: rgb('#64748B'),
  inactiveShimmer: rgb('#94A3B8'),
  subtle: rgb('#475569'),
  suggestion: rgb('#00F5FF'),
  remember: rgb('#A855F7'),
  background: rgb('#00F5FF'),
  success: rgb('#10B981'),
  error: rgb('#EF4444'),
  warning: rgb('#F59E0B'),
  merged: rgb('#A855F7'),
  warningShimmer: rgb('#FBBF24'),
  diffAdded: rgb('#064E3B'),
  diffRemoved: rgb('#7F1D1D'),
  diffAddedDimmed: rgb('#022C22'),
  diffRemovedDimmed: rgb('#450A0A'),
  diffAddedWord: rgb('#10B981'),
  diffRemovedWord: rgb('#EF4444'),
  toolCardBackground: rgb('#1E293B'),
  toolCardBackgroundDim: rgb('#0F172A'),
  toolDotExec: rgb('#00F5FF'),
  toolDotRead: rgb('#38BDF8'),
  toolDotWrite: rgb('#A855F7'),
  toolDotWeb: rgb('#06B6D4'),
  toolDotTask: rgb('#EC4899'),
  syntaxKeyword: rgb('#38BDF8'),
  syntaxString: rgb('#FBBF24'),
  syntaxComment: rgb('#64748B'),
  syntaxNumber: rgb('#F97316'),
  syntaxFunction: rgb('#00F5FF'),
  syntaxType: rgb('#A855F7'),
  syntaxVariable: rgb('#E2E8F0'),
  syntaxOperator: rgb('#00F5FF'),
  syntaxPunctuation: rgb('#94A3B8'),
  syntaxConstant: rgb('#F43F5E'),
  red_FOR_SUBAGENTS_ONLY: rgb('#EF4444'),
  blue_FOR_SUBAGENTS_ONLY: rgb('#3B82F6'),
  green_FOR_SUBAGENTS_ONLY: rgb('#10B981'),
  yellow_FOR_SUBAGENTS_ONLY: rgb('#F59E0B'),
  purple_FOR_SUBAGENTS_ONLY: rgb('#A855F7'),
  orange_FOR_SUBAGENTS_ONLY: rgb('#F97316'),
  pink_FOR_SUBAGENTS_ONLY: rgb('#EC4899'),
  cyan_FOR_SUBAGENTS_ONLY: rgb('#00F5FF'),
  professionalBlue: rgb('#38BDF8'),
  chromeYellow: rgb('#FBBF24'),
  clawd_body: rgb('#00F5FF'),
  clawd_background: rgb('#0F172A'),
  userMessageBackground: rgb('#1E293B'),
  userMessageBackgroundHover: rgb('#334155'),
  messageActionsBackground: rgb('#0F172A'),
  selectionBg: rgb('#312E81'),
  bashMessageBackgroundColor: rgb('#0F172A'),
  memoryBackgroundColor: rgb('#1E293B'),
  rate_limit_fill: rgb('#00F5FF'),
  rate_limit_empty: rgb('#334155'),
  fastMode: rgb('#00F5FF'),
  fastModeShimmer: rgb('#67E8F9'),
  briefLabelYou: rgb('#A855F7'),
  briefLabelClaude: rgb('#00F5FF'),
  rainbow_red: rgb('#EF4444'),
  rainbow_orange: rgb('#F97316'),
  rainbow_yellow: rgb('#FBBF24'),
  rainbow_green: rgb('#10B981'),
  rainbow_blue: rgb('#3B82F6'),
  rainbow_indigo: rgb('#6366F1'),
  rainbow_violet: rgb('#A855F7'),
  rainbow_red_shimmer: rgb('#F87171'),
  rainbow_orange_shimmer: rgb('#FB923C'),
  rainbow_yellow_shimmer: rgb('#FDE047'),
  rainbow_green_shimmer: rgb('#34D399'),
  rainbow_blue_shimmer: rgb('#60A5FA'),
  rainbow_indigo_shimmer: rgb('#818CF8'),
  rainbow_violet_shimmer: rgb('#C084FC'),
}

/**
 * Antigravity Theme: Deep Violet & Cyber Magenta Singularity
 */
const antigravityTheme: Theme = {
  ...auroraTheme,
  claude: rgb('#C026D3'),
  claudeShimmer: rgb('#E879F9'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#C026D3'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#E879F9'),
  promptBorder: rgb('#4C1D95'),
  promptBorderShimmer: rgb('#C026D3'),
  toolDotExec: rgb('#C026D3'),
  toolDotRead: rgb('#818CF8'),
  toolDotWrite: rgb('#EC4899'),
  syntaxKeyword: rgb('#C026D3'),
  syntaxFunction: rgb('#E879F9'),
}

/**
 * Solar Amber: Cyberpunk Golden CRT
 */
const solarAmberTheme: Theme = {
  ...auroraTheme,
  claude: rgb('#F59E0B'),
  claudeShimmer: rgb('#FDE047'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#F59E0B'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#FDE047'),
  promptBorder: rgb('#78350F'),
  promptBorderShimmer: rgb('#F59E0B'),
  toolDotExec: rgb('#F59E0B'),
  syntaxKeyword: rgb('#F59E0B'),
  syntaxFunction: rgb('#FBBF24'),
}

/**
 * Cyber Matrix: High-Tech Emerald Phosphor
 */
const cyberMatrixTheme: Theme = {
  ...auroraTheme,
  claude: rgb('#10B981'),
  claudeShimmer: rgb('#34D399'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#10B981'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#34D399'),
  promptBorder: rgb('#064E3B'),
  promptBorderShimmer: rgb('#10B981'),
  toolDotExec: rgb('#10B981'),
  syntaxKeyword: rgb('#10B981'),
  syntaxFunction: rgb('#34D399'),
}

/**
 * Ice Slate: Nordic Frost & Arctic Blue
 */
const iceSlateTheme: Theme = {
  ...auroraTheme,
  claude: rgb('#38BDF8'),
  claudeShimmer: rgb('#7DD3FC'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#38BDF8'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#7DD3FC'),
  promptBorder: rgb('#1E3A8A'),
  promptBorderShimmer: rgb('#38BDF8'),
  toolDotExec: rgb('#38BDF8'),
  syntaxKeyword: rgb('#38BDF8'),
  syntaxFunction: rgb('#7DD3FC'),
}

/**
 * Clean Mono: Pure High-Contrast Monochrome
 */
const cleanMonoTheme: Theme = {
  ...auroraTheme,
  claude: rgb('#F8FAFC'),
  claudeShimmer: rgb('#FFFFFF'),
  claudeBlue_FOR_SYSTEM_SPINNER: rgb('#F8FAFC'),
  claudeBlueShimmer_FOR_SYSTEM_SPINNER: rgb('#FFFFFF'),
  promptBorder: rgb('#475569'),
  promptBorderShimmer: rgb('#F8FAFC'),
  toolDotExec: rgb('#F8FAFC'),
  syntaxKeyword: rgb('#F8FAFC'),
  syntaxFunction: rgb('#CBD5E1'),
}

export function getTheme(name?: string): Theme {
  switch (name?.toLowerCase().trim()) {
    case 'antigravity': return antigravityTheme
    case 'solar-amber': return solarAmberTheme
    case 'cyber-matrix': return cyberMatrixTheme
    case 'ice-slate': return iceSlateTheme
    case 'clean-mono':
    case 'mono': return cleanMonoTheme
    case 'dark':
    case 'dark-ansi':
    case 'aurora':
    default:
      return auroraTheme
  }
}
