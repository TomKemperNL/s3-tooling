import { defineConfig } from 'vite'

export default defineConfig({
  root: './src/renderer',
  base: './',
  build: {
    sourcemap: true,
    outDir: "./../../dist/src/renderer"
  }
})