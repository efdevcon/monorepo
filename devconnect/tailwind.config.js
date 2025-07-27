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
    },
  },
  plugins: [
    function ({ addVariant }) {
      addVariant('mouse-only', '@media screen and (pointer: fine)')
      addVariant('touch-only', '@media screen and (pointer: coarse)')
    },
  ],
}
