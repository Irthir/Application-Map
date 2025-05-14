import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Application-Map/',
  define: {
  'process.env.VITE_MAPBOX_KEY': JSON.stringify(process.env.VITE_MAPBOX_KEY),
  'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
  // Ajoutez uniquement les variables nécessaires
  },
  build: {
    chunkSizeWarningLimit: 2000, // Agmenter la limite à 2000 Ko
  },
});
