/** Avti-owned terminal commands over existing Harness services. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent, ModelSelection, ModelSelectionRef } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type {} from '@deepseek-ai/dsh-session-query'

export interface AvtiDefaultModelService {
  currentSelection(): ModelSelection
  saveSelection(next: ModelSelection): Promise<void>
}

export interface AvtiTerminalCommandContext {
  readonly ctx: Context
  readonly agent: Agent
  readonly selection: ModelSelectionRef
  readonly defaultModel: AvtiDefaultModelService
  readonly cwd: string
  readonly write?: (text: string) => void
}

export type AvtiTerminalCommandResult = 'handled' | 'exit' | 'unhandled'

function outputOf(context: AvtiTerminalCommandContext): (text: string) => void {
  return context.write ?? (text => { process.stdout.write(text) })
}

function selectedModel(context: AvtiTerminalCommandContext): ModelSelection {
  return context.selection.current ?? context.defaultModel.currentSelection()
}

function parseCommand(input: string): { command: string; args: string[] } {
  const parts = input.trim().split(/\s+/u).filter(Boolean)
  return { command: parts[0]?.toLowerCase() ?? '', args: parts.slice(1) }
}

export function formatAvtiStatus(context: AvtiTerminalCommandContext): string {
  const selected = selectedModel(context)
  const permission = process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
  return [
    '',
    `  Project    ${context.cwd}`,
    `  Provider   ${selected.provider}`,
    `  Model      ${selected.model}`,
    ...(selected.reasoningEffort === undefined ? [] : [`  Reasoning  ${String(selected.reasoningEffort)}`]),
    `  Session    ${String(context.agent.id)}`,
    `  Permission ${permission}`,
    '',
  ].join('\n')
}

async function renderModels(context: AvtiTerminalCommandContext, providerFilter?: string): Promise<void> {
  const write = outputOf(context)
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    write('\n  × Model registry is unavailable\n\n')
    return
  }

  const selected = selectedModel(context)
  const providers = llm.listProviders()
    .filter(provider => providerFilter === undefined || provider.id === providerFilter)

  if (providers.length === 0) {
    write(`\n  × Provider not found${providerFilter === undefined ? '' : `: ${providerFilter}`}\n\n`)
    return
  }

  write('\n')
  for (const provider of providers) {
    write(`  ${provider.name} · ${provider.id}\n`)
    try {
      const models = await llm.listModels(provider.id)
      if (models.length === 0) {
        write('    · No catalog entries (custom model ids may still work)\n')
        continue
      }
      for (const model of models) {
        const current = selected.provider === provider.id && selected.model === model.id ? '›' : ' '
        write(`    ${current} ${model.name} · ${model.id}\n`)
      }
    } catch (error: unknown) {
      write(`    × ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }
  write('\n')
}

async function switchModel(context: AvtiTerminalCommandContext, args: readonly string[]): Promise<void> {
  const write = outputOf(context)
  const current = selectedModel(context)
  if (args.length === 0) {
    write(`\n  ${current.provider} · ${current.model}\n\n`)
    return
  }

  const provider = args.length === 1 ? current.provider : args[0]!
  const model = args.length === 1 ? args[0]! : args.slice(1).join(' ')
  const llm = context.ctx.get('llm')
  if (llm === undefined) {
    write('\n  × Model registry is unavailable\n\n')
    return
  }

  try {
    const resolved = await llm.resolveModelInfo(provider, model)
    const next: ModelSelection = { provider: resolved.provider, model: resolved.id }
    context.selection.current = next
    await context.defaultModel.saveSelection(next)
    write(`\n  ✓ Model · ${resolved.name} (${resolved.provider}/${resolved.id})\n\n`)
  } catch (error: unknown) {
    write(`\n  × Could not select model: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

async function renderSessions(context: AvtiTerminalCommandContext): Promise<void> {
  const write = outputOf(context)
  const query = context.ctx.get('sessionQuery')
  if (query === undefined) {
    write('\n  × Session history is unavailable\n\n')
    return
  }

  try {
    const sessions = (await query.listSessions())
      .filter(record => record.persisted && record.header.cwd === context.cwd)
      .slice(0, 10)

    write('\n')
    if (sessions.length === 0) {
      write('  No saved sessions for this project.\n\n')
      return
    }

    write('  Recent sessions\n')
    for (const record of sessions) {
      const current = record.header.id === context.agent.id ? '›' : ' '
      const created = new Date(record.header.createdAt).toLocaleString()
      write(`  ${current} ${String(record.header.id)} · ${created}\n`)
    }
    write('\n  Resume with: avti --resume <session-id>\n\n')
  } catch (error: unknown) {
    write(`\n  × Could not read sessions: ${error instanceof Error ? error.message : String(error)}\n\n`)
  }
}

export async function handleAvtiTerminalCommand(
  input: string,
  context: AvtiTerminalCommandContext,
): Promise<AvtiTerminalCommandResult> {
  if (!input.trimStart().startsWith('/')) return 'unhandled'
  const { command, args } = parseCommand(input)
  const write = outputOf(context)

  switch (command) {
    case '/exit':
    case '/quit':
      return 'exit'
    case '/help':
      write([
        '',
        '  /status                 show project, model and session',
        '  /models [provider]      list available models',
        '  /model                  show current model',
        '  /model <model>          switch model on current provider',
        '  /model <provider> <id>  switch provider and model',
        '  /sessions               show recent project sessions',
        '  /exit                   leave Avti',
        '',
      ].join('\n'))
      return 'handled'
    case '/status':
      write(formatAvtiStatus(context))
      return 'handled'
    case '/models':
      await renderModels(context, args[0])
      return 'handled'
    case '/model':
      await switchModel(context, args)
      return 'handled'
    case '/sessions':
      await renderSessions(context)
      return 'handled'
    default:
      write(`\n  × Unknown command: ${command}\n  Run /help to see Avti commands.\n\n`)
      return 'handled'
  }
}
