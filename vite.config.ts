// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Application-Map/',
  plugins: [react()],
  define: {
    'process.env': process.env, // 👈 pour utiliser les variables d’environnement
  },
});
