/** Thin Avti-branded entrypoint over the existing DeepSeek Harness CLI runtime. */

import { spawn } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  ensureAvtiAntigravityPatch,
  withAvtiAntigravityPatch,
} from './avti-antigravity.ts'
import { runAvtiControl } from './avti-control.ts'
import { runAvtiInteractive } from './avti-interactive.ts'
import { packagedDependencyPath } from './packaged-runtime-path.ts'
import { renderAvtiIntro } from './avti-terminal-style.ts'

const RUN_AS_NODE = 'ELECTRON_RUN_AS_NODE'
const DSH_HOME = 'DSH_HOME'
const AVTI_CLI_HOME = 'AVTI_CLI_HOME'
const DSH_ENTRY_URL = pathToFileURL(
  packagedDependencyPath(import.meta.url, '@deepseek-ai/dsh/lib/bin.js'),
).href

const AVTI_CONTROL_COMMANDS = new Set(['status', 'models', 'model', 'sessions', 'doctor'])

export const AVTI_CLI_HELP = `AVTI

Usage:
  avti                            start an interactive session in this project
  avti <task>                     run one task and exit
  avti resume <session-id>        continue a saved CLI session from this project
  avti status                     show project and CLI default model
  avti models [provider]          list available models
  avti model [provider] <model>   show or change the CLI default model
  avti sessions                   list recent CLI sessions for this project
  avti doctor                     check workspace and Harness services
  avti --profile <name> [args]    boot an Avti CLI profile
  avti web [args]                 boot the CLI-owned web profile
  avti plugin [args]              manage CLI profile plugins

Options:
  -h, --help                      show Avti CLI help
  -V, --version                   show Avti version

Interactive commands:
  /help                           show terminal commands
  /status                         show project, model and session
  /models [provider]              list available models
  /model [provider] <model>       show or change model for following turns
  /sessions                       show recent project sessions
  /theme [name]                   show or change terminal theme
  /exit                           leave Avti

Model bridges:
  antigravity                     ClaudeGravity-compatible local provider
                                  proxy: http://127.0.0.1:8080

State:
  default home                    ~/.avti/cli
  AVTI_CLI_HOME                   override the Avti CLI home
  DSH_HOME                        advanced Harness home override

Examples:
  avti
  avti "run the tests and fix failures"
  avti sessions
  avti resume avti-<session-id>
  avti status
  avti models
  avti models antigravity
  avti model antigravity gemini-3.7-flash-high
  avti doctor
  avti --profile headless "explain this project"
  avti web
`

export interface AvtiHarnessInvocation {
  readonly mode: 'harness'
  readonly args: string[]
  readonly intro: boolean
}

export type AvtiLocalInvocation =
  | { readonly mode: 'interactive' }
  | { readonly mode: 'help' }
  | { readonly mode: 'version' }

export interface AvtiResumeInvocation {
  readonly mode: 'resume'
  readonly sessionId: string
}

export interface AvtiControlInvocation {
  readonly mode: 'control'
  readonly command: string
  readonly args: string[]
}

export type AvtiInvocation = AvtiHarnessInvocation | AvtiLocalInvocation | AvtiResumeInvocation | AvtiControlInvocation

type HarnessLoader = (
  url: string,
  argv: readonly string[],
  environment: NodeJS.ProcessEnv,
) => Promise<unknown>

/** Remove Electron Node mode before Harness creates child processes. */
export function clearAvtiElectronRunAsNode(environment: NodeJS.ProcessEnv): void {
  for (const key of Object.keys(environment)) {
    if (key.toUpperCase() === RUN_AS_NODE) delete environment[key]
  }
}

/**
 * Give Avti CLI an independent Harness home unless the caller explicitly chose one.
 * Desktop keeps its own process/home; CLI defaults to ~/.avti/cli and therefore owns
 * separate settings, profiles, credentials, plugins and persisted sessions.
 */
export function configureAvtiCliHome(environment: NodeJS.ProcessEnv): string {
  const explicitDshHome = environment[DSH_HOME]?.trim()
  if (explicitDshHome !== undefined && explicitDshHome !== '') return explicitDshHome

  const configured = environment[AVTI_CLI_HOME]?.trim()
  const home = configured !== undefined && configured !== ''
    ? configured
    : join(homedir(), '.avti', 'cli')
  environment[DSH_HOME] = home
  return home
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
  if (args.length === 0) return { mode: 'interactive' }
  if (args.length === 1 && (args[0] === '-h' || args[0] === '--help')) return { mode: 'help' }
  if (args.length === 1 && (args[0] === '-V' || args[0] === '--version')) return { mode: 'version' }

  const first = args[0]!
  if (first === 'resume') {
    const sessionId = args[1]
    if (sessionId === undefined || sessionId.trim() === '') {
      return { mode: 'help' }
    }
    return { mode: 'resume', sessionId }
  }
  if (AVTI_CONTROL_COMMANDS.has(first)) {
    return { mode: 'control', command: first, args: args.slice(1) }
  }
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
 * `@deepseek-ai/dsh/lib/bin.js` is a CLI entrypoint, not a library API. Importing
 * it from Avti can make its own direct-execution guard treat the module as a plain
 * import and return without running anything. Execute it as a real Node child so
 * its argv/stdio/exit semantics match the published `dsh` command.
 */
async function runHarnessCliEntry(
  url: string,
  argv: readonly string[],
  environment: NodeJS.ProcessEnv,
): Promise<void> {
  const entry = fileURLToPath(url)
  await new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...argv.slice(2)], {
      cwd: process.cwd(),
      env: environment,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal !== null) {
        reject(new Error(`Harness terminated by signal ${signal}`))
        return
      }
      if (code !== 0) {
        reject(new Error(`Harness exited with code ${code ?? 1}`))
        return
      }
      resolve()
    })
  })
}

/**
 * Launch Avti over the existing Harness runtime. Avti owns only the outer grammar,
 * independent CLI home, interactive terminal frontend and presentation; tools,
 * permissions, sessions, model calls and agent execution remain upstream.
 */
export async function runAvtiCli(
  environment: NodeJS.ProcessEnv = process.env,
  load: HarnessLoader = runHarnessCliEntry,
  argv: string[] = process.argv,
  prepareProviderPatch: (environment: NodeJS.ProcessEnv) => string = ensureAvtiAntigravityPatch,
): Promise<void> {
  clearAvtiElectronRunAsNode(environment)
  configureAvtiCliHome(environment)
  const invocation = resolveAvtiInvocation(argv.slice(2))

  if (invocation.mode === 'help') {
    process.stdout.write(AVTI_CLI_HELP)
    return
  }
  if (invocation.mode === 'version') {
    process.stdout.write(`${packageVersion()}\n`)
    return
  }

  const providerPatchPath = prepareProviderPatch(environment)
  if (environment === process.env) {
    // runAvtiInteractive/control use loadLayeredEnv(), which reads process.env.
    // In production this is the same object; keep the local proxy key explicit.
    process.env.ANTIGRAVITY_API_KEY = environment.ANTIGRAVITY_API_KEY
  }

  if (invocation.mode === 'control') {
    await runAvtiControl(invocation.command, invocation.args, providerPatchPath)
    return
  }
  if (invocation.mode === 'interactive') {
    await renderAvtiIntro({ output: process.stdout, environment })
    await runAvtiInteractive({ providerPatchPath })
    return
  }
  if (invocation.mode === 'resume') {
    await renderAvtiIntro({ output: process.stdout, environment })
    await runAvtiInteractive({ resumeSessionId: invocation.sessionId, providerPatchPath })
    return
  }

  const harnessArgs = withAvtiAntigravityPatch(invocation.args, providerPatchPath)
  argv.splice(2, argv.length - 2, ...harnessArgs)
  if (invocation.intro) {
    await renderAvtiIntro({ output: process.stdout, environment })
  }
  await load(DSH_ENTRY_URL, argv, environment)
}

/** Resolve macOS aliases/symlinks (for example /var -> /private/var) before comparing. */
export function sameAvtiExecutionPath(modulePath: string, entryPath: string): boolean {
  try {
    return realpathSync(modulePath) === realpathSync(entryPath)
  } catch {
    return modulePath === entryPath
  }
}

function isDirectExecution(): boolean {
  const entry = process.argv[1]
  return entry !== undefined && sameAvtiExecutionPath(fileURLToPath(import.meta.url), entry)
}

if (isDirectExecution()) {
  void runAvtiCli().catch((cause: unknown) => {
    process.stderr.write(
      `avti: failed to start: ${cause instanceof Error ? cause.stack ?? cause.message : String(cause)}\n`,
    )
    process.exitCode = 1
  })
}
