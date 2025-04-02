import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Application-Map/', // Remplace 'nom-du-repository' par le nom de ton dépôt GitHub
})
