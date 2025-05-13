import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Application-Map/',
  define: {
    'process.env': process.env, // Pour utiliser les variables d’environnement
  },
});
