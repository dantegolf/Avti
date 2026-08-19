import { execFileSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '..')
const distRoot = join(packageRoot, 'dist')
const outputRoot = join(distRoot, 'avti-windows-x64')
const appRoot = join(outputRoot, 'app')
const focusedNodeModules = join(packageRoot, 'node_modules')
const libRoot = join(packageRoot, 'lib')

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error(`Avti CLI Windows bundle must be built on win32 x64, got ${process.platform} ${process.arch}`)
}
if (!existsSync(join(libRoot, 'avti.js'))) {
  throw new Error('Avti CLI build output is missing; run the build before packaging')
}
if (!existsSync(focusedNodeModules)) {
  throw new Error('Avti CLI production node_modules is missing; run `yarn workspaces focus avti-cli --production` first')
}

const packageJson = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(appRoot, { recursive: true })

// Copy the production-focused Yarn tree rather than reinstalling through npm.
// This preserves repository resolutions and patch: dependencies in the portable artifact.
cpSync(focusedNodeModules, join(appRoot, 'node_modules'), {
  recursive: true,
  dereference: true,
  force: true,
})
cpSync(libRoot, join(appRoot, 'lib'), { recursive: true, force: true })
copyFileSync(join(packageRoot, 'package.json'), join(appRoot, 'package.json'))

copyFileSync(process.execPath, join(outputRoot, 'node.exe'))
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

const smoke = execFileSync(join(outputRoot, 'node.exe'), [
  join(appRoot, 'lib', 'avti.js'),
  '--version',
], { cwd: outputRoot, encoding: 'utf8' }).trim()
if (smoke !== packageJson.version) {
  throw new Error(`packaged Avti CLI reported ${JSON.stringify(smoke)} instead of ${packageJson.version}`)
}

process.stdout.write(`Standalone Avti CLI staged at ${outputRoot}\n`)
