import sharp from 'sharp'

const source = new URL('../build/app-icon-source.svg', import.meta.url)
const target = new URL('../build/app-icon.png', import.meta.url)

await sharp(source)
  .resize(1024, 1024, { fit: 'contain' })
  .png()
  .toFile(target)

console.log('Generated Avti app icon from build/app-icon-source.svg')
