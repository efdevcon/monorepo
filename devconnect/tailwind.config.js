// const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['src/**/*.{ts,tsx}', '../lib/**/*.{ts,tsx}', '!**/node_modules/**'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-roboto)'], // , ...fontFamily.sans],
      },
      maskImage: {
        'fade-right': 'linear-gradient(to right, black 0%, black 80%, transparent 100%)',
      },
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('mouse-only', '@media screen and (pointer: fine)')
      addVariant('touch-only', '@media screen and (pointer: coarse)')
    },
    function ({ addUtilities }) {
      addUtilities({
        '.mask-fade-right': {
          'mask-image': 'linear-gradient(to right, black 0%, black 80%, transparent 100%)',
          '-webkit-mask-image': 'linear-gradient(to right, black 0%, black 80%, transparent 100%)',
        },
        '.mask-fade-bottom': {
          'mask-image': 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
          '-webkit-mask-image': 'linear-gradient(to bottom, black 0%, black 80%, transparent 100%)',
        },
      })
    },
  ],
}
