import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel serves the site at the root ("/").
// GitHub Pages serves it in a sub-folder ("/MedFriend_MVP/"), built with: npm run build:pages
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'github-pages' ? '/MedFriend_MVP/' : '/',
}))
