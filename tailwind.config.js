/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",  // Assurez-vous que tous les fichiers de contenu sont bien inclus
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',  // Exemple de couleur primaire personnalisée
        secondary: '#0056b3',  // Exemple de couleur secondaire
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],  // Exemple d'ajout de police
      },
      spacing: {
        '128': '32rem',  // Exemple d'ajout de taille personnalisée
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),  // Ajout de plugin typographie si nécessaire
  ],
  purge: {
    enabled: process.env.NODE_ENV === 'production',  // Activer la purge des classes inutilisées en production
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
  },
};
