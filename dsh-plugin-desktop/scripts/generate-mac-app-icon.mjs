import { resolve } from 'node:path'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const source = resolve(root, 'build/avti-icon.svg')
const standardIcon = resolve(root, 'build/app-icon.png')
const macIcon = resolve(root, 'build/app-icon-mac.png')

const iconSize = 1024
const macArtworkSize = 824
const macInset = (iconSize - macArtworkSize) / 2

await sharp(source, { density: 768 })
  .resize(iconSize, iconSize, { fit: 'fill' })
  .ensureAlpha()
  .toColourspace('rgb16')
  .withIccProfile('srgb')
  .png({ compressionLevel: 9 })
  .toFile(standardIcon)

const standardMetadata = await sharp(standardIcon).metadata()
if (
  standardMetadata.width !== iconSize
  || standardMetadata.height !== iconSize
  || standardMetadata.channels !== 4
  || standardMetadata.bitsPerSample !== 16
  || standardMetadata.hasAlpha !== true
  || standardMetadata.hasProfile !== true
) {
  throw new Error('generated Avti app icon must be a 1024x1024 16-bit RGBA PNG with an ICC profile')
}

await sharp(standardIcon)
  .resize(macArtworkSize, macArtworkSize, { fit: 'fill' })
  .extend({
    top: macInset,
    right: macInset,
    bottom: macInset,
    left: macInset,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .toColourspace('rgb16')
  .withIccProfile('srgb')
  .png({ compressionLevel: 9 })
  .toFile(macIcon)

const macMetadata = await sharp(macIcon).metadata()
if (
  macMetadata.width !== iconSize
  || macMetadata.height !== iconSize
  || macMetadata.channels !== 4
  || macMetadata.bitsPerSample !== 16
  || macMetadata.hasAlpha !== true
  || macMetadata.hasProfile !== true
) {
  throw new Error('generated Avti macOS icon must be a 1024x1024 16-bit RGBA PNG with an ICC profile')
}

process.stdout.write('generated Avti app icons from build/avti-icon.svg\n')
