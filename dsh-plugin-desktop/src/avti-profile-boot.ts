/** Avti-owned profile boot adapter over public Harness packages.
 *
 * Harness 0.1.0-rc.7 does not publish its internal CLI `profile-boot.js` file,
 * so the standalone terminal frontend must not import that private path.
 * This adapter composes the same profile layers through `dsh-app-boot` while
 * leaving the Agent/runtime implementation entirely upstream.
 */

import { writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import {
  boot,
  healProfilesModuleFallback,
  loadOptionalPatches,
  loadOverlayPatches,
  loadProfile,
  PROFILE_PATCH_FILENAME,
} from '@deepseek-ai/dsh-app-boot'
import { provideCmdline } from '@deepseek-ai/dsh-cmdline'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import {
  DSH_LAUNCH_ENVIRONMENT_KEY,
  type LaunchEnvironmentSnapshot,
} from '@deepseek-ai/dsh-launch-environment'
import { packagedDependencyPath } from './packaged-runtime-path.ts'

const BIN_NAME = 'dsh'
const PROFILE_ROOT_FILENAME = 'cordis.yml'
const PROFILE_ROOT_CONFIG = '[]\n'
const INSTALL_ANCHOR = packagedDependencyPath(import.meta.url, '@deepseek-ai/dsh/package.json')

export interface AvtiProfileBootOptions {
  readonly environment: LaunchEnvironmentSnapshot
  readonly profile: string
  readonly patchFiles: readonly string[]
  readonly args: readonly string[]
}

export interface AvtiProcessShutdown {
  shutdown(code: number): Promise<void>
}

/** Boot one Harness profile for Avti without relying on unpublished dsh internals. */
export async function runProfile(
  options: AvtiProfileBootOptions,
): Promise<{ ctx: Context; shutdown: AvtiProcessShutdown }> {
  healProfilesModuleFallback(INSTALL_ANCHOR)
  const profile = loadProfile(BIN_NAME, options.profile, INSTALL_ANCHOR)
  const rootConfig = join(profile.dir, PROFILE_ROOT_FILENAME)
  writeFileSync(rootConfig, PROFILE_ROOT_CONFIG)

  const homePatches = loadOptionalPatches(
    BIN_NAME,
    join(resolveDshHome(), PROFILE_PATCH_FILENAME),
  ) ?? []
  const overlays = options.patchFiles.flatMap(file => loadOverlayPatches(BIN_NAME, resolve(file)))
  const patches = [
    ...profile.layers.flatMap(layer => layer.patches),
    ...profile.patches,
    ...homePatches,
    ...overlays,
  ]

  let ctx: Context | undefined
  let shuttingDown = false
  const shutdown: AvtiProcessShutdown = {
    async shutdown(code: number): Promise<void> {
      if (shuttingDown) return
      shuttingDown = true
      await ctx?.fiber.dispose()
      if (code !== 0) process.exitCode = code
    },
  }

  ctx = await boot(
    BIN_NAME,
    rootConfig,
    structuredClone(patches),
    host => {
      host.provide(DSH_LAUNCH_ENVIRONMENT_KEY, options.environment)
      provideCmdline(host, {
        args: options.args,
        exit: code => { void shutdown.shutdown(code) },
      })
    },
  )

  return { ctx, shutdown }
}
