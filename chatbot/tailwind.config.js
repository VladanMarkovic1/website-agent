/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'bounce-delayed': 'bounce 1s infinite 0.5s',
      },
      zIndex: {
        '100': '100',
      },
    },
  },
  plugins: [],
} 