/** Thin Avti-branded entrypoint over the existing DeepSeek Harness CLI runtime. */

import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { packagedDependencyPath } from './packaged-runtime-path.ts'
import { renderAvtiIntro } from './avti-terminal-style.ts'

const RUN_AS_NODE = 'ELECTRON_RUN_AS_NODE'
const DSH_ENTRY_URL = pathToFileURL(
  packagedDependencyPath(import.meta.url, '@deepseek-ai/dsh/lib/bin.js'),
).href

export const AVTI_CLI_HELP = `AVTI

Usage:
  avti <task>                     run one task in the current project
  avti --profile <name> [args]    boot an existing Harness profile
  avti web [args]                 boot the web profile
  avti plugin [args]              manage Harness profile plugins

Options:
  -h, --help                      show Avti CLI help
  -V, --version                   show Avti version

Examples:
  avti "run the tests and fix failures"
  avti --profile headless "explain this project"
  avti web
`

export interface AvtiHarnessInvocation {
  readonly mode: 'harness'
  readonly args: string[]
  readonly intro: boolean
}

export interface AvtiLocalInvocation {
  readonly mode: 'help' | 'version'
}

export type AvtiInvocation = AvtiHarnessInvocation | AvtiLocalInvocation

/** Remove Electron Node mode before Harness creates child processes. */
export function clearAvtiElectronRunAsNode(environment: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase() === RUN_AS_NODE) delete environment[key]
  }
}

function packageVersion(): string {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version?: unknown }
  if (typeof manifest.version !== 'string') throw new Error('package.json has no string version')
  return manifest.version
}

function isExplicitHarnessFrontDoor(first: string): boolean {
  return first === 'web'
    || first === 'plugin'
    || first === '--profile'
    || first.startsWith('--profile=')
    || first === '--patch'
    || first.startsWith('--patch=')
    || first === '--dump-config'
    || first === '--dump-default-config'
}

/**
 * Resolve the Avti-facing grammar without duplicating Harness' inner command parser.
 * Ordinary text becomes the existing one-shot headless profile; explicit Harness
 * launcher modes continue through unchanged.
 */
export function resolveAvtiInvocation(args: readonly string[]): AvtiInvocation {
  if (args.length === 0) return { mode: 'help' }
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) return { mode: 'help' }
  if (args.length === 1 && (args[0] === '-V' || args[0] === '--version')) return { mode: 'version' }

  const first = args[0]!
  if (isExplicitHarnessFrontDoor(first) || first.startsWith('-')) {
    const profileIndex = args.findIndex(argument => argument === '--profile')
    const explicitHeadless = args.some(argument => argument === '--profile=headless')
      || (profileIndex >= 0 && args[profileIndex + 1] === 'headless')
    return { mode: 'harness', args: [...args], intro: explicitHeadless }
  }

  return {
    mode: 'harness',
    args: ['--profile', 'headless', ...args],
    intro: true,
  }
}

/**
 * Launch the existing Harness CLI. Avti owns only the outer brand grammar and
 * startup presentation; runtime behavior, tools, permissions, sessions and agent
 * execution remain upstream.
 */
export async function runAvtiCli(
  environment: NodeJS.ProcessEnv = process.env,
  load: (url: string) => Promise<unknown> = url => import(url),
  argv: string[] = process.argv,
): Promise<void> {
  clearAvtiElectronRunAsNode(environment)
  const invocation = resolveAvtiInvocation(argv.slice(2))

  if (invocation.mode === 'help') {
    process.stdout.write(AVTI_CLI_HELP)
    return
  }
  if (invocation.mode === 'version') {
    process.stdout.write(`${packageVersion()}\n`)
    return
  }

  argv.splice(2, argv.length - 2, ...invocation.args)
  if (invocation.intro) {
    await renderAvtiIntro({ output: process.stdout, environment })
  }
  await load(DSH_ENTRY_URL)
}

function isDirectExecution(): boolean {
  const entry = process.argv[1]
  return entry !== undefined && fileURLToPath(import.meta.url) === entry
}

if (isDirectExecution()) {
  void runAvtiCli().catch((cause: unknown) => {
    process.stderr.write(
      `avti: failed to start Harness CLI: ${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}\n`,
    )
    process.exitCode = 1
  })
}
