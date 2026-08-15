import { defineConfig } from 'tsdown'

/** Build the package root and the client face as independent bundles. */
export default defineConfig([
  {
    entry: ['lib/types/index.js'],
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2024',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'lib/types/client/index.js' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'browser',
    target: 'es2022',
    fixedExtension: false,
    dts: false,
    clean: false,
  },
])
