/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        emerald: { 400: '#34d399', 500: '#10b981', 600: '#059669', 900: '#064e3b' },
        gold: { 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706' },
        dark: { 900: '#0a0f0a', 800: '#0f1a0f', 700: '#1a2e1a', 600: '#1f3a1f' },
      },
    },
  },
  plugins: [],
}
