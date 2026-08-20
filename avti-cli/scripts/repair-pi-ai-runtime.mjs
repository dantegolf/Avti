import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const MANIFEST_FILE = '.manifest.json'
const SCHEMA_VERSION = 3

function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

function sortedRecord(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)))
}

function readProviderStructure(content, filename) {
  const groups = JSON.parse(content)
  if (typeof groups !== 'object' || groups === null || Array.isArray(groups)) {
    throw new Error(`Invalid pi-ai provider catalog: ${filename}`)
  }

  const models = new Map()
  for (const [api, value] of Object.entries(groups)) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error(`Invalid pi-ai API group ${api} in ${filename}`)
    }
    for (const modelId of Object.keys(value)) {
      if (models.has(modelId)) throw new Error(`Duplicate pi-ai model ${modelId} in ${filename}`)
      models.set(modelId, api)
    }
  }
  return sortedRecord(models)
}

/**
 * @earendil-works/pi-ai 0.82.x imports dist/providers/data/.manifest.json from
 * providers/all.js, but that dotfile can be absent from the installed npm payload.
 * Portable Avti bundles copy the installed production tree verbatim, so repair the
 * generated catalog stamp in the staged runtime before smoke-testing it.
 */
export function ensurePiAiModelManifest(nodeModulesRoot) {
  const packageRoot = join(nodeModulesRoot, '@earendil-works', 'pi-ai')
  const dataDir = join(packageRoot, 'dist', 'providers', 'data')
  const manifestPath = join(dataDir, MANIFEST_FILE)
  if (existsSync(manifestPath)) return manifestPath
  if (!existsSync(dataDir) || !statSync(dataDir).isDirectory()) {
    throw new Error(`pi-ai provider data directory is missing: ${dataDir}`)
  }

  const filenames = readdirSync(dataDir)
    .filter(filename => filename.endsWith('.json') && filename !== MANIFEST_FILE)
    .sort()
  if (filenames.length === 0) throw new Error(`pi-ai provider data is empty: ${dataDir}`)

  const structureEntries = []
  const fileHashEntries = []
  for (const filename of filenames) {
    const content = readFileSync(join(dataDir, filename), 'utf8')
    const providerId = filename.slice(0, -'.json'.length)
    structureEntries.push([providerId, readProviderStructure(content, filename)])
    fileHashEntries.push([filename, sha256(content)])
  }

  const structure = sortedRecord(structureEntries)
  const manifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    structureHash: sha256(JSON.stringify(structure)),
    files: sortedRecord(fileHashEntries),
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifestPath
}
