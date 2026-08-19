import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '..')
const distRoot = join(packageRoot, 'dist')
const arch = process.arch
const artifactArch = arch === 'arm64' ? 'arm64' : arch === 'x64' ? 'x64' : undefined

if (process.platform !== 'darwin' || artifactArch === undefined) {
  throw new Error(`Avti CLI macOS bundle must be built on darwin arm64/x64, got ${process.platform} ${process.arch}`)
}

const outputRoot = join(distRoot, `avti-macos-${artifactArch}`)
const appRoot = join(outputRoot, 'app')
const focusedNodeModules = join(packageRoot, 'node_modules')
const libRoot = join(packageRoot, 'lib')

if (!existsSync(join(libRoot, 'avti.js'))) {
  throw new Error('Avti CLI build output is missing; run the build before packaging')
}
if (!existsSync(focusedNodeModules)) {
  throw new Error('Avti CLI production node_modules is missing; run `yarn workspaces focus avti-cli --production` first')
}
if (existsSync(join(focusedNodeModules, 'electron'))) {
  throw new Error('Standalone Avti CLI production tree unexpectedly contains Electron')
}
if (existsSync(join(focusedNodeModules, 'dsh-plugin-desktop'))) {
  throw new Error('Standalone Avti CLI production tree unexpectedly contains dsh-plugin-desktop')
}

const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(appRoot, { recursive: true })

cpSync(focusedNodeModules, join(appRoot, 'node_modules'), {
  recursive: true,
  dereference: true,
  force: true,
})
cpSync(libRoot, join(appRoot, 'lib'), { recursive: true, force: true })
copyFileSync(join(packageRoot, 'package.json'), join(appRoot, 'package.json'))

const nodePath = join(outputRoot, 'node')
copyFileSync(process.execPath, nodePath)
chmodSync(nodePath, 0o755)

const launcherPath = join(outputRoot, 'avti')
writeFileSync(launcherPath, [
  '#!/bin/sh',
  'set -eu',
  'ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"',
  'exec "$ROOT/node" "$ROOT/app/lib/avti.js" "$@"',
  '',
].join('\n'))
chmodSync(launcherPath, 0o755)

const license = join(repoRoot, 'LICENSE')
if (existsSync(license)) copyFileSync(license, join(outputRoot, 'LICENSE'))
for (const filename of ['README.md', 'THIRD_PARTY_NOTICES.md']) {
  const source = join(packageRoot, filename)
  if (existsSync(source)) copyFileSync(source, join(outputRoot, filename))
}
writeFileSync(join(outputRoot, 'VERSION'), `${packageJson.version}\n`)

const smoke = execFileSync(launcherPath, ['--version'], {
  cwd: outputRoot,
  encoding: 'utf8',
}).trim()
if (smoke !== packageJson.version) {
  throw new Error(`packaged Avti CLI reported ${JSON.stringify(smoke)} instead of ${packageJson.version}`)
}

process.stdout.write(`Standalone Avti CLI macOS ${artifactArch} staged at ${outputRoot}\n`)
