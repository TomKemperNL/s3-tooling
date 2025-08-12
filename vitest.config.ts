import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test:{          
          environment: 'node',
          include: ['test/node/**/*.test.ts']
        }
        
      },
      {
        extends: true,
        test:{          
          environment: 'jsdom',
          include: ['test/web/**/*.test.ts']
        }        
      }
    ]
    
  },
})