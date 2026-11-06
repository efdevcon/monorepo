/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    'src/**/*.{ts,tsx}',
    '../lib/**/*.{ts,tsx}',
    '!../lib/node_modules/**',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Poppins', 'sans-serif'],
        // Retro terminal face for the Devcon IX announcement strip + hero caption
        terminal: ['VT323', 'monospace'],
      },
      keyframes: {
        // Terminal cursor: hard on/off, no fade
        blink: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
