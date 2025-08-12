import { defineConfig } from 'vite'

export default defineConfig({
  root: './src/renderer',  
  base: './',
  build: {    
    rollupOptions: {
      input: {
        main: './src/renderer/index.html',
        screenshot: './src/renderer/screenshot.html',
        web: './src/renderer/web.html'
      }
    },
    sourcemap: true,
    outDir: "./../../dist/src/renderer"
  }
})