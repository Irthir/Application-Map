// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Application-Map/', // <-- important pour GitHub Pages
  plugins: [react()],
})
