/** Generate Avti application icons from the canonical AvtiCode SVG source. */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const buildRoot = join(packageRoot, 'build')
const sourcePath = join(buildRoot, 'app-icon-source.svg')
const source = Buffer.from(await readFile(sourcePath, 'utf8'))

const canvasSize = 1024
const macArtworkSize = 824
const macInset = (canvasSize - macArtworkSize) / 2

await sharp(source)
  .resize({ width: canvasSize, height: canvasSize, fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(join(buildRoot, 'app-icon.png'))

await sharp(source)
  .resize({ width: macArtworkSize, height: macArtworkSize, fit: 'contain' })
  .extend({
    top: macInset,
    bottom: macInset,
    left: macInset,
    right: macInset,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ compressionLevel: 9 })
  .toFile(join(buildRoot, 'app-icon-mac.png'))
