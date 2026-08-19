import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'avti-cli',
  entry: {
    avti: '../dsh-plugin-desktop/src/avti-cli.ts',
  },
  outDir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: true,
  sourcemap: true,
  outputOptions: {
    banner: '#!/usr/bin/env node',
  },
})
