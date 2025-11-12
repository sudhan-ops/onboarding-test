import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // FIX: Replaced __dirname with './' to resolve a TypeScript error. This resolves from the current working directory.
      '@': path.resolve('./'),
    },
  },
})