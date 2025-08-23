import { defineConfig } from 'vite'

export default defineConfig({
  root: './src/renderer',  
  base: '/',
  build: {    
    rollupOptions: {
      input: {
        web: './src/renderer/web.html'
      }
    },
    sourcemap: true,
    outDir: "./../../dist/src/web"
  }
})