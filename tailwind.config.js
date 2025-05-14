// tailwind.config.js

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
        'primary-dark': '#0056b3',
        'map-blue': '#3B82F6',
        client: '#10B981',
        prospect: '#F59E0B',
        'dark-gray': '#1F2937',
        'light-gray': '#E2E8F0',
      },
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
