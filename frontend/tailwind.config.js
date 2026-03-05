/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: { DEFAULT: '#2563EB', light: '#3B82F6', dark: '#1D4ED8' },
        accent: '#0EA5E9',
        sidebar: '#0F172A',
        success: '#10B981',
        danger: '#EF4444',
        warning: '#F59E0B',
        surface: '#F8FAFC',
      }
    }
  },
  plugins: []
}
