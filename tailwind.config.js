/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50:  '#f7f7f8',
          100: '#eeeef0',
          200: '#d8d8de',
          300: '#b6b6c0',
          400: '#8a8a98',
          500: '#5e5e6e',
          600: '#454553',
          700: '#33333d',
          800: '#22222a',
          900: '#131318',
          950: '#0a0a0d'
        },
        accent: {
          400: '#7dd3fc',
          500: '#38bdf8',
          600: '#0ea5e9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Code', 'Consolas', 'monospace']
      }
    }
  },
  plugins: []
}
