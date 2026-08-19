import { execFileSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '..')
const distRoot = join(packageRoot, 'dist')
const outputRoot = join(distRoot, 'avti-windows-x64')
const appRoot = join(outputRoot, 'app')
const tempRoot = join(packageRoot, '.package-tmp')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

if (process.platform !== 'win32' || process.arch !== 'x64') {
  throw new Error(`Avti CLI Windows bundle must be built on win32 x64, got ${process.platform} ${process.arch}`)
}
if (!existsSync(join(packageRoot, 'lib', 'avti.js'))) {
  throw new Error('Avti CLI build output is missing; run the build before packaging')
}

rmSync(outputRoot, { recursive: true, force: true })
rmSync(tempRoot, { recursive: true, force: true })
mkdirSync(outputRoot, { recursive: true })
mkdirSync(appRoot, { recursive: true })
mkdirSync(tempRoot, { recursive: true })

try {
  execFileSync(npmCommand, ['pack', '--pack-destination', tempRoot], {
    cwd: packageRoot,
    stdio: 'inherit',
  })
  const archive = readdirSync(tempRoot).find(name => name.endsWith('.tgz'))
  if (archive === undefined) throw new Error('npm pack did not produce an Avti CLI tarball')

  writeFileSync(join(appRoot, 'package.json'), JSON.stringify({
    name: 'avti-cli-runtime',
    private: true,
    version: '0.0.0',
  }, null, 2) + '\n')

  execFileSync(npmCommand, [
    'install',
    '--omit=dev',
    '--no-audit',
    '--no-fund',
    join(tempRoot, archive),
  ], {
    cwd: appRoot,
    stdio: 'inherit',
  })

  copyFileSync(process.execPath, join(outputRoot, 'node.exe'))
  writeFileSync(join(outputRoot, 'avti.cmd'), [
    '@echo off',
    'setlocal',
    '"%~dp0node.exe" "%~dp0app\\node_modules\\avti-cli\\lib\\avti.js" %*',
    'exit /b %errorlevel%',
    '',
  ].join('\r\n'))

  const license = join(repoRoot, 'LICENSE')
  if (existsSync(license)) copyFileSync(license, join(outputRoot, 'LICENSE'))
  const readme = join(packageRoot, 'README.md')
  if (existsSync(readme)) copyFileSync(readme, join(outputRoot, 'README.md'))

  const packageJson = JSON.parse(await import('node:fs/promises').then(({ readFile }) => readFile(join(packageRoot, 'package.json'), 'utf8')))
  writeFileSync(join(outputRoot, 'VERSION'), `${packageJson.version}\n`)

  const smoke = execFileSync(join(outputRoot, 'node.exe'), [
    join(appRoot, 'node_modules', 'avti-cli', 'lib', 'avti.js'),
    '--version',
  ], { cwd: outputRoot, encoding: 'utf8' }).trim()
  if (smoke !== packageJson.version) {
    throw new Error(`packaged Avti CLI reported ${JSON.stringify(smoke)} instead of ${packageJson.version}`)
  }

  process.stdout.write(`Standalone Avti CLI staged at ${outputRoot}\n`)
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
