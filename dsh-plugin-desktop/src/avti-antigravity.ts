/** Avti provider preset for the local Antigravity bridge used by ClaudeGravity. */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const AVTI_ANTIGRAVITY_PROVIDER = 'antigravity'
export const AVTI_ANTIGRAVITY_BASE_URL = 'http://127.0.0.1:8080'
export const AVTI_ANTIGRAVITY_KEY_ENV = 'ANTIGRAVITY_API_KEY'

export const AVTI_ANTIGRAVITY_MODELS = [
  { id: 'gemini-3.6-flash-high', contextWindow: 1_000_000 },
  { id: 'claude-sonnet-4-6', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-pro', contextWindow: 2_000_000 },
  { id: 'claude-opus-4-6-thinking', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-flash', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-flash-lite', contextWindow: 1_000_000 },
  { id: 'gemini-2.5-flash-thinking', contextWindow: 1_000_000 },
  { id: 'gemini-3-flash', contextWindow: 1_000_000 },
  { id: 'gemini-3-flash-agent', contextWindow: 1_000_000 },
  { id: 'gemini-3.1-flash-image', contextWindow: 1_000_000 },
  { id: 'gemini-3.1-flash-lite', contextWindow: 1_000_000 },
  { id: 'gemini-3.1-pro-high', contextWindow: 1_000_000 },
  { id: 'gemini-3.1-pro-low', contextWindow: 1_000_000 },
  { id: 'gemini-3.5-flash-extra-low', contextWindow: 1_000_000 },
  { id: 'gemini-3.5-flash-low', contextWindow: 1_000_000 },
  { id: 'gemini-3.6-flash-low', contextWindow: 1_000_000 },
  { id: 'gemini-3.6-flash-medium', contextWindow: 1_000_000 },
  { id: 'gemini-3.6-flash-tiered', contextWindow: 1_000_000 },
  { id: 'gemini-3.7-flash-low', contextWindow: 1_000_000, maxTokens: 65_536 },
  { id: 'gemini-3.7-flash-medium', contextWindow: 1_000_000, maxTokens: 65_536 },
  { id: 'gemini-3.7-flash-high', contextWindow: 1_000_000, maxTokens: 65_536 },
  { id: 'gemini-pro-agent', contextWindow: 1_000_000 },
] as const

function yamlModel(model: (typeof AVTI_ANTIGRAVITY_MODELS)[number]): string {
  const maxTokens = 'maxTokens' in model ? `\n            maxTokens: ${model.maxTokens}` : ''
  return `          - id: ${model.id}\n            name: ${model.id}\n            contextWindow: ${model.contextWindow}${maxTokens}`
}

/**
 * Composition overlay for the already-mounted dsh-llm-pi-ai adapter. The local
 * proxy speaks Anthropic Messages while translating upstream to Antigravity's
 * Google/Cloud Code transport, so the agent remains provider-neutral.
 */
export function avtiAntigravityPatch(): string {
  return `# Avti optional local Antigravity bridge (ClaudeGravity compatible).\n- id: llm-pi-ai\n  config:\n    providers:\n      ${AVTI_ANTIGRAVITY_PROVIDER}:\n        displayName: Antigravity (ClaudeGravity)\n        apiKeyEnv: ${AVTI_ANTIGRAVITY_KEY_ENV}\n        api: anthropic-messages\n        baseURL: ${AVTI_ANTIGRAVITY_BASE_URL}\n        defaultContextWindow: 1000000\n        defaultMaxTokens: 32768\n        models:\n${AVTI_ANTIGRAVITY_MODELS.map(yamlModel).join('\n')}\n`
}

/** Give the loopback proxy its conventional local key without touching real credentials. */
export function configureAvtiAntigravityEnvironment(environment: NodeJS.ProcessEnv): void {
  const existing = environment[AVTI_ANTIGRAVITY_KEY_ENV]?.trim()
  if (existing === undefined || existing === '') environment[AVTI_ANTIGRAVITY_KEY_ENV] = 'antigravity'
}

/**
 * Keep a stable generated overlay under the CLI home so interactive, control,
 * one-shot and explicit Harness front doors can all address the same provider.
 */
export function ensureAvtiAntigravityPatch(environment: NodeJS.ProcessEnv): string {
  configureAvtiAntigravityEnvironment(environment)
  const home = environment.DSH_HOME?.trim()
  if (home === undefined || home === '') throw new Error('DSH_HOME must be configured before Avti provider presets')
  const runtimeDir = join(home, 'runtime')
  const path = join(runtimeDir, 'antigravity.patch.yml')
  mkdirSync(runtimeDir, { recursive: true, mode: 0o700 })
  writeFileSync(path, avtiAntigravityPatch(), { mode: 0o600 })
  return path
}

/** Add the generated provider overlay unless this exact path is already present. */
export function withAvtiAntigravityPatch(args: readonly string[], patchPath: string): string[] {
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (argument === '--patch' && args[index + 1] === patchPath) return [...args]
    if (argument === `--patch=${patchPath}`) return [...args]
  }
  return ['--patch', patchPath, ...args]
}
