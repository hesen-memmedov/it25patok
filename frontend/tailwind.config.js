/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Manrope Variable"', 'Manrope', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#fbf0f3',
          100: '#f6dee4',
          200: '#eec1cc',
          300: '#dd93a8',
          400: '#c85f81',
          500: '#a52a57',
          600: '#910a35',
          700: '#7a0830',
          800: '#660730',
          900: '#590724',
          DEFAULT: '#910a35',
        },
        violet: {
          300: '#c07896',
          400: '#a84e76',
          500: '#873a5e',
          600: '#6b2a4a',
          700: '#55203a',
          900: '#2e101f',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(145, 10, 53, 0.22)',
        glow: '0 0 0 1px rgba(145, 10, 53, .14), 0 18px 50px -20px rgba(145, 10, 53, .5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
}
