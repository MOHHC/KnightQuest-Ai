import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT: replace KnightQuest-Ai with your repo name
export default defineConfig({
  base: '/KnightQuest-Ai/',
  plugins: [react()],
})
