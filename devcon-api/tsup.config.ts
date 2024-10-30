import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  dts: true,
  clean: true,
  outDir: 'dist/devcon-api/src',
  sourcemap: true,
  skipNodeModulesBundle: true,
  target: 'node20',
  outExtension: ({ format }) => ({
    js: '.js',
  }),
})
