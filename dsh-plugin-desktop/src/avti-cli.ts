/** Thin Avti-branded entrypoint over the existing DeepSeek Harness CLI runtime. */

import { fileURLToPath, pathToFileURL } from 'node:url'
import { clearElectronRunAsNode } from './desktop-cli.ts'
import { packagedDependencyPath } from './packaged-runtime-path.ts'
import { renderAvtiIntro } from './avti-terminal-style.ts'

const DSH_ENTRY_URL = pathToFileURL(
  packagedDependencyPath(import.meta.url, '@deepseek-ai/dsh/lib/bin.js'),
).href

/** Global launcher modes should stay byte-for-byte upstream and skip decorative startup output. */
export function shouldRenderAvtiIntro(argv: readonly string[]): boolean {
  const first = argv[0]
  return first !== '--help'
    && first !== '-h'
    && first !== '--version'
    && first !== '-V'
    && first !== 'plugin'
}

/**
 * Launch the existing Harness CLI without changing its arguments, runtime behavior,
 * streaming, permissions, history, tools, or exit handling.
 */
export async function runAvtiCli(
  environment: NodeJS.ProcessEnv = process.env,
  load: (url: string) => Promise<unknown> = url => import(url),
  argv: string[] = process.argv,
): Promise<void> {
  clearElectronRunAsNode(environment)

  if (shouldRenderAvtiIntro(argv.slice(2))) {
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
