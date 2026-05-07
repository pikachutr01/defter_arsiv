import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Cormorant Garamond"', ...defaultTheme.fontFamily.serif],
        sans: ['"DM Sans"', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
}