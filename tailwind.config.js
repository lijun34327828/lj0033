/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        earth: {
          50: '#F5F0EB',
          100: '#EDE5DA',
          200: '#D4A574',
          300: '#C49A6C',
          400: '#A67C52',
          500: '#8B6F47',
          600: '#735B3A',
          700: '#5C4830',
          800: '#453625',
          900: '#2E241A',
        },
        forest: {
          500: '#2D5016',
          600: '#244012',
          700: '#1B300E',
        },
        crimson: {
          500: '#C41E3A',
          600: '#A3182F',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
