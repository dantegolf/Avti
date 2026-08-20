/** Avti CLI control commands backed directly by Harness services. */

import { accessSync, constants, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type { ModelSelection } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import { loadLayeredEnv } from '@deepseek-ai/dsh-app-boot'
import type {} from '@deepseek-ai/dsh-session-persistence'
import type {} from '@deepseek-ai/dsh-session-query'
import { AVTI_ANTIGRAVITY_BASE_URL, AVTI_ANTIGRAVITY_PROVIDER } from './avti-antigravity.ts'
import { runProfile } from './avti-profile-boot.ts'
import { packagedDependencyPath } from './packaged-runtime-path.ts'

const CONTROL_PATCH = `# Avti control commands need Harness services, not the one-shot runner.
- id: headless-startup
  disabled: true
- id: headless-runner
  disabled: true
`

interface ProcessShutdown { shutdown(code: number): Promise<void> }

async function bootControl(providerPatchPath?: string): Promise<{ ctx: Context; shutdown: ProcessShutdown }> {
  const root = mkdtempSync(join(tmpdir(), 'avti-control-'))
  const patchPath = join(root, 'control.patch.yml')
  writeFileSync(patchPath, CONTROL_PATCH)
  try {
    return await runProfile({
      environment: loadLayeredEnv('dsh'),
      profile: 'headless',
      patchFiles: [patchPath, ...(providerPatchPath === undefined ? [] : [providerPatchPath])],
      args: [],
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function modelLine(selection: ModelSelection): string {
  return `${selection.provider} · ${selection.model}`
}

async function showModels(ctx: Context, providerFilter?: string): Promise<void> {
  const llm = ctx.get('llm')
  if (llm === undefined) throw new Error('model registry is unavailable')
  const current = ctx.get('agentDefaultModel')?.currentSelection()
  const providers = llm.listProviders().filter(p => providerFilter === undefined || p.id === providerFilter)
  if (providers.length === 0) throw new Error(`provider not found: ${providerFilter ?? '(none)'}`)

  for (const provider of providers) {
    process.stdout.write(`\n${provider.name} · ${provider.id}\n`)
    const models = await llm.listModels(provider.id)
    if (models.length === 0) {
      process.stdout.write('  · No catalog entries (custom model ids may still work)\n')
      continue
    }
    for (const model of models) {
      const mark = current?.provider === provider.id && current.model === model.id ? '›' : ' '
      process.stdout.write(`  ${mark} ${model.name} · ${model.id}\n`)
    }
  }
  process.stdout.write('\n')
}

async function setModel(ctx: Context, args: readonly string[]): Promise<void> {
  const defaultModel = ctx.get('agentDefaultModel')
  const llm = ctx.get('llm')
  if (defaultModel === undefined || llm === undefined) throw new Error('model services are unavailable')
  const current = defaultModel.currentSelection()
  if (args.length === 0) {
    process.stdout.write(`${modelLine(current)}\n`)
    return
  }

  const provider = args.length === 1 ? current.provider : args[0]!
  const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
  const resolved = await llm.resolveModelInfo(provider, model)
  const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
  await defaultModel.saveSelection(next)
  process.stdout.write(`✓ ${resolved.name} · ${resolved.provider}/${resolved.id}\n`)
}

async function showSessions(ctx: Context): Promise<void> {
  const query = ctx.get('sessionQuery')
  if (query === undefined) throw new Error('session history is unavailable')
  const cwd = process.cwd()
  const records = (await query.listSessions())
    .filter(record => record.persisted && record.header.cwd === cwd)
    .slice(0, 10)

  if (records.length === 0) {
    process.stdout.write('No saved sessions for this project.\n')
    return
  }
  process.stdout.write(`Recent sessions · ${cwd}\n\n`)
  for (const record of records) {
    process.stdout.write(`  ${String(record.header.id)} · ${new Date(record.header.createdAt).toLocaleString()}\n`)
  }
}

async function antigravityHealth(): Promise<void> {
  const response = await fetch(`${AVTI_ANTIGRAVITY_BASE_URL}/health`, {
    signal: AbortSignal.timeout(1500),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
}

async function runDoctor(ctx: Context): Promise<void> {
  const checks: Array<{ label: string; run: () => void | Promise<void> }> = [
    {
      label: 'Workspace',
      run: () => { accessSync(process.cwd(), constants.R_OK | constants.W_OK) },
    },
    {
      label: 'Agent runtime',
      run: () => { if (ctx.get('agents') === undefined) throw new Error('agent registry unavailable') },
    },
    {
      label: 'Session persistence',
      run: () => { if (ctx.get('sessionPersistence') === undefined) throw new Error('persistence unavailable') },
    },
    {
      label: 'Session history',
      run: () => { if (ctx.get('sessionQuery') === undefined) throw new Error('session query unavailable') },
    },
    {
      label: 'Provider',
      run: () => {
        const llm = ctx.get('llm')
        const selection = ctx.get('agentDefaultModel')?.currentSelection()
        if (llm === undefined || selection === undefined) throw new Error('model services unavailable')
        if (!llm.listProviders().some(provider => provider.id === selection.provider)) {
          throw new Error(`provider not registered: ${selection.provider}`)
        }
      },
    },
    {
      label: 'Model',
      run: async () => {
        const llm = ctx.get('llm')
        const selection = ctx.get('agentDefaultModel')?.currentSelection()
        if (llm === undefined || selection === undefined) throw new Error('model services unavailable')
        await llm.resolveModelInfo(selection.provider, selection.model)
      },
    },
  ]

  const selection = ctx.get('agentDefaultModel')?.currentSelection()
  if (selection?.provider === AVTI_ANTIGRAVITY_PROVIDER) {
    checks.push({
      label: 'Antigravity proxy',
      run: antigravityHealth,
    })
  }

  process.stdout.write('AVTI Doctor\n\n')
  let failed = 0
  for (const check of checks) {
    try {
      await check.run()
      process.stdout.write(`✓ ${check.label}\n`)
    } catch (error: unknown) {
      failed += 1
      process.stdout.write(`× ${check.label} · ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
  process.stdout.write(failed === 0 ? '\nReady.\n' : `\n${failed} check(s) need attention.\n`)
  if (failed > 0) process.exitCode = 1
}

/** Run one short Avti control command and dispose the same Harness profile cleanly. */
export async function runAvtiControl(
  command: string,
  args: readonly string[],
  providerPatchPath?: string,
): Promise<void> {
  const { ctx, shutdown } = await bootControl(providerPatchPath)
  try {
    await ctx.get('loader')?.await()
    switch (command) {
      case 'status': {
        const selection = ctx.get('agentDefaultModel')?.currentSelection()
        if (selection === undefined) throw new Error('default model service is unavailable')
        process.stdout.write(`Project   ${process.cwd()}\nProvider  ${selection.provider}\nModel     ${selection.model}\n`)
        return
      }
      case 'models':
        await showModels(ctx, args[0])
        return
      case 'model':
        await setModel(ctx, args)
        return
      case 'sessions':
        await showSessions(ctx)
        return
      case 'doctor':
        await runDoctor(ctx)
        return
      default:
        throw new Error(`unknown Avti command: ${command}`)
    }
  } finally {
    await shutdown.shutdown(process.exitCode === 1 ? 1 : 0)
  }
}
