/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['src/**/*.{ts,tsx}', '../lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        body: ['Poppins', 'sans-serif'],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
