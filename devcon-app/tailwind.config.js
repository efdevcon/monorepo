/** @type {import('tailwindcss').Config} */

const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
	darkMode: ['class'],
	content: ['src/**/*.{ts,tsx}', '../lib/**/*.{ts,tsx}'],
	plugins: [require("tailwindcss-animate")],
	theme: {
		extend: {
			screens: {
				'2xl': '1440px',
				// => @media (min-width: 992px) { ... }
			},
		},
	}
}
