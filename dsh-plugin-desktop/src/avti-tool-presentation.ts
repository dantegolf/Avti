/** Human-facing Avti labels for Harness tool activity. */

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
