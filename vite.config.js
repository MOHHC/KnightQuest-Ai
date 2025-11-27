import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace knightquest-ai-frontend with your repo name
export default defineConfig({
  base: '/knightquest-ai-frontend/',
  plugins: [react()],
})
