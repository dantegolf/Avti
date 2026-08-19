import { execFileSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensurePiAiModelManifest } from './repair-pi-ai-runtime.mjs'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '..')
const distRoot = join(packageRoot, 'dist')
const outputRoot = join(distRoot, 'avti-windows-x64')
const appRoot = join(outputRoot, 'app')
const runtimeNodeModules = join(repoRoot, 'dsh-plugin-desktop', 'node_modules')
const libRoot = join(packageRoot, 'lib')

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error(`Avti CLI Windows bundle must be built on win32 x64, got ${process.platform} ${process.arch}`)
}
if (!existsSync(join(libRoot, 'avti.js')) || !existsSync(join(libRoot, 'avti-profile-boot.js'))) {
  throw new Error('Avti CLI build output is missing; run the build before packaging')
}
if (!existsSync(runtimeNodeModules)) {
  throw new Error('Harness runtime node_modules is missing; run `yarn install` before packaging')
}

const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
if (packageJson.dependencies?.electron !== undefined || packageJson.peerDependencies?.electron !== undefined) {
  throw new Error('Avti CLI package metadata must not depend on Electron')
}
if (packageJson.dependencies?.['dsh-plugin-desktop'] !== undefined) {
  throw new Error('Avti CLI package metadata must not depend on dsh-plugin-desktop')
}

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(appRoot, { recursive: true })

const packagedNodeModules = join(appRoot, 'node_modules')
cpSync(runtimeNodeModules, packagedNodeModules, {
  recursive: true,
  dereference: true,
  force: true,
})
rmSync(join(packagedNodeModules, 'electron'), { recursive: true, force: true })
rmSync(join(packagedNodeModules, 'dsh-plugin-desktop'), { recursive: true, force: true })
rmSync(join(packagedNodeModules, '.bin', 'electron.cmd'), { force: true })
rmSync(join(packagedNodeModules, '.bin', 'electron.ps1'), { force: true })
rmSync(join(packagedNodeModules, '.bin', 'electron'), { force: true })

if (existsSync(join(packagedNodeModules, 'electron'))) {
  throw new Error('Standalone Avti CLI runtime unexpectedly contains Electron')
}
if (existsSync(join(packagedNodeModules, 'dsh-plugin-desktop'))) {
  throw new Error('Standalone Avti CLI runtime unexpectedly contains dsh-plugin-desktop')
}

ensurePiAiModelManifest(packagedNodeModules)

cpSync(libRoot, join(appRoot, 'lib'), { recursive: true, force: true })
copyFileSync(join(packageRoot, 'package.json'), join(appRoot, 'package.json'))

const dshLibRoot = join(packagedNodeModules, '@deepseek-ai', 'dsh', 'lib')
mkdirSync(dshLibRoot, { recursive: true })
writeFileSync(
  join(dshLibRoot, 'profile-boot.js'),
  "export { runProfile } from '../../../../lib/avti-profile-boot.js'\n",
)

const nodePath = join(outputRoot, 'node.exe')
copyFileSync(process.execPath, nodePath)
writeFileSync(join(outputRoot, 'avti.cmd'), [
  '@echo off',
  'setlocal',
  '"%~dp0node.exe" "%~dp0app\\lib\\avti.js" %*',
  'exit /b %errorlevel%',
  '',
].join('\r\n'))

const license = join(repoRoot, 'LICENSE')
if (existsSync(license)) copyFileSync(license, join(outputRoot, 'LICENSE'))
const readme = join(packageRoot, 'README.md')
if (existsSync(readme)) copyFileSync(readme, join(outputRoot, 'README.md'))
writeFileSync(join(outputRoot, 'VERSION'), `${packageJson.version}\n`)

const smoke = execFileSync(nodePath, [
  join(appRoot, 'lib', 'avti.js'),
  '--version',
], { cwd: outputRoot, encoding: 'utf8' }).trim()
if (smoke !== packageJson.version) {
  throw new Error(`packaged Avti CLI reported ${JSON.stringify(smoke)} instead of ${packageJson.version}`)
}

const smokeHome = join(outputRoot, '.smoke-home')
rmSync(smokeHome, { recursive: true, force: true })
try {
  const modelsSmoke = execFileSync(nodePath, [
    join(appRoot, 'lib', 'avti.js'),
    'models',
    'antigravity',
  ], {
    cwd: outputRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      AVTI_CLI_HOME: smokeHome,
      AVTI_NO_MOTION: '1',
    },
  })
  if (!modelsSmoke.includes('gemini-3.7-flash-high')) {
    throw new Error('packaged Avti CLI model smoke did not expose the Antigravity catalog')
  }
} finally {
  rmSync(smokeHome, { recursive: true, force: true })
}

process.stdout.write(`Standalone Avti CLI staged at ${outputRoot}\n`)
