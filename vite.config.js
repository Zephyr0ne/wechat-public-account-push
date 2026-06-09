import { defineConfig } from 'vite'
import fs from 'fs-extra'
import { builtinModules } from 'module'

const nodeBuiltins = [...new Set([
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
])]

export default defineConfig({
  build: {
    lib: {
      entry: 'main.js',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    outDir: 'cloud',
    rollupOptions: {
      external: [
        ...nodeBuiltins,
        'node-schedule',
        'axios',
        'jsdom',
        'lodash/cloneDeep.js',
        'lunar-javascript',
        'sharp',
        'dayjs',
        'dayjs/plugin/timezone.js',
        'dayjs/plugin/utc.js',
      ],
      plugins: [{
        async load(id) {
          if (/\/config\/exp-config\.js$/.test(id)) {
            return (await fs.readFile(id)).toString()
              .replace('import USER_CONFIG from \'./index.cjs\'', 'var USER_CONFIG = require(\'../config/index.cjs\')')
          }
          return null
        },
      }],
    },
  },
})
