/** Human-facing Avti labels for Harness tool activity. */

import {
  AVTI_THEMES,
  BOLD,
  DIM,
  RESET,
  type AvtiTheme,
} from './avti-theme.ts'

export type AvtiToolCategory =
  | 'read'
  | 'write'
  | 'exec'
  | 'search'
  | 'web'
  | 'task'
  | 'agent'
  | 'workflow'
  | 'system'

export interface AvtiToolPresentation {
  /** Short progressive label shown while the call is active. */
  readonly active: string
  /** Stable completion label for a successful call. */
  readonly success: string
  /** Stable completion label for a failed call. */
  readonly failure: string
}

const EXACT_PRESENTATIONS: Readonly<Record<string, AvtiToolPresentation>> = {
  read: { active: 'Reading files', success: 'Read files', failure: 'Could not read files' },
  read_image: { active: 'Reading image', success: 'Read image', failure: 'Could not read image' },
  write: { active: 'Writing files', success: 'Wrote files', failure: 'Could not write files' },
  edit: { active: 'Editing files', success: 'Edited files', failure: 'Could not edit files' },
  fs_read: { active: 'Reading files', success: 'Read files', failure: 'Could not read files' },
  read_file: { active: 'Reading files', success: 'Read files', failure: 'Could not read files' },
  fs_write: { active: 'Writing files', success: 'Wrote files', failure: 'Could not write files' },
  write_file: { active: 'Writing files', success: 'Wrote files', failure: 'Could not write files' },
  fs_edit: { active: 'Editing files', success: 'Edited files', failure: 'Could not edit files' },
  edit_file: { active: 'Editing files', success: 'Edited files', failure: 'Could not edit files' },
  apply_patch: { active: 'Editing files', success: 'Edited files', failure: 'Could not edit files' },
  fs_search: { active: 'Searching project', success: 'Searched project', failure: 'Search failed' },
  grep: { active: 'Searching project', success: 'Searched project', failure: 'Search failed' },
  glob: { active: 'Finding files', success: 'Found files', failure: 'Could not find files' },
  bash: { active: 'Running command', success: 'Ran command', failure: 'Command failed' },
  pwsh: { active: 'Running command', success: 'Ran command', failure: 'Command failed' },
  shell: { active: 'Running command', success: 'Ran command', failure: 'Command failed' },
  todo_write: { active: 'Updating tasks', success: 'Updated tasks', failure: 'Could not update tasks' },
  skill: { active: 'Loading skill', success: 'Loaded skill', failure: 'Could not load skill' },
  subagent: { active: 'Delegating work', success: 'Delegated work', failure: 'Delegation failed' },
  subagent_fork: { active: 'Delegating work', success: 'Delegated work', failure: 'Delegation failed' },
  workflow: { active: 'Running workflow', success: 'Ran workflow', failure: 'Workflow failed' },
  web_fetch: { active: 'Reading web', success: 'Read web', failure: 'Web request failed' },
  web_search: { active: 'Searching web', success: 'Searched web', failure: 'Web search failed' },
  ask_user_question: { active: 'Waiting for input', success: 'Received input', failure: 'Input cancelled' },
}

function normalizeToolName(name: string): string {
  return name.trim().toLowerCase().replace(/[.:/\\-]+/gu, '_')
}

/** Convert a machine-oriented tool identifier into a conservative title. */
export function humanizeAvtiToolName(name: string): string {
  const words = normalizeToolName(name)
    .split('_')
    .filter(Boolean)
  if (words.length === 0) return 'Tool'
  return words
    .map(word => word[0]!.toUpperCase() + word.slice(1))
    .join(' ')
}

/** Resolve a stable Avti presentation without changing the underlying tool identity. */
export function avtiToolPresentation(name: string): AvtiToolPresentation {
  const normalized = normalizeToolName(name)
  const exact = EXACT_PRESENTATIONS[normalized]
  if (exact !== undefined) return exact

  if (normalized.includes('search') || normalized.includes('grep') || normalized.includes('glob')) {
    return { active: 'Searching project', success: 'Searched project', failure: 'Search failed' }
  }
  if (normalized.includes('read')) {
    return { active: 'Reading', success: 'Read', failure: 'Read failed' }
  }
  if (normalized.includes('write') || normalized.includes('edit') || normalized.includes('patch')) {
    return { active: 'Editing', success: 'Edited', failure: 'Edit failed' }
  }
  if (normalized.includes('bash') || normalized.includes('pwsh') || normalized.includes('shell') || normalized.includes('command')) {
    return { active: 'Running command', success: 'Ran command', failure: 'Command failed' }
  }

  const title = humanizeAvtiToolName(name)
  return {
    active: `Using ${title}`,
    success: title,
    failure: `${title} failed`,
  }
}

export function avtiToolCategory(name: string): AvtiToolCategory {
  const normalized = normalizeToolName(name)
  if (normalized.includes('search') || normalized.includes('grep') || normalized.includes('glob')) return 'search'
  if (normalized.includes('read')) return 'read'
  if (normalized.includes('write') || normalized.includes('edit') || normalized.includes('patch')) return 'write'
  if (normalized.includes('bash') || normalized.includes('pwsh') || normalized.includes('shell') || normalized.includes('command')) return 'exec'
  if (normalized.includes('web') || normalized.includes('fetch')) return 'web'
  if (normalized.includes('subagent')) return 'agent'
  if (normalized.includes('workflow')) return 'workflow'
  if (normalized.includes('todo')) return 'task'
  return 'system'
}

export function avtiToolGlyph(category: AvtiToolCategory): string {
  switch (category) {
    case 'read': return '⟳'
    case 'write': return '✎'
    case 'exec': return '⚡'
    case 'search': return '⚲'
    case 'web': return '🌐'
    case 'agent': return '⎈'
    case 'workflow': return '∞'
    case 'task': return '📋'
    case 'system': return '⚙'
  }
}

/**
 * Render a structured Avti Tool Card with Unicode box borders and timing metrics.
 */
export function renderAvtiToolCard(options: {
  toolName: string
  details?: string
  status: 'active' | 'success' | 'failure'
  durationMs?: number
  theme?: AvtiTheme
}): string {
  const theme = options.theme ?? AVTI_THEMES[0]!
  const pres = avtiToolPresentation(options.toolName)
  const cat = avtiToolCategory(options.toolName)
  const glyph = avtiToolGlyph(cat)
  const border = theme.borderAnsi || DIM

  let title = pres.active
  if (options.status === 'success') {
    title = pres.success
  } else if (options.status === 'failure') {
    title = pres.failure
  }

  const durationStr = options.durationMs !== undefined ? ` ${DIM}(${options.durationMs}ms)${RESET}` : ''
  const header = `  ${border}╭─${RESET} ${glyph} ${BOLD}${title}${RESET}${durationStr}`

  if (!options.details) {
    return `${header}\n  ${border}╰──────────────────────────────────────────${RESET}`
  }

  const detailLines = options.details.split('\n').map(line => `  ${border}│${RESET}  ${line}`)
  return [
    header,
    ...detailLines,
    `  ${border}╰──────────────────────────────────────────${RESET}`,
  ].join('\n')
}

/**
 * Render a syntax-colored diff preview block for code modification tools.
 */
export function renderAvtiDiffPreview(
  filePath: string,
  addedLines: readonly string[],
  removedLines: readonly string[],
  theme: AvtiTheme = AVTI_THEMES[0]!,
): string {
  const border = theme.borderAnsi || DIM
  const lines: string[] = [
    `  ${border}┌───${RESET} ${theme.accentAnsi}✎ ${filePath}${RESET}`,
  ]

  for (const line of removedLines) {
    lines.push(`  ${border}│${RESET} ${theme.errorAnsi}- ${line}${RESET}`)
  }
  for (const line of addedLines) {
    lines.push(`  ${border}│${RESET} ${theme.successAnsi}+ ${line}${RESET}`)
  }

  lines.push(`  ${border}└───${RESET}`)
  return lines.join('\n')
}
