/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d9ff',
          300: '#a4bfff',
          400: '#818eff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        parchment: {
          50: '#fbf7ee',
          100: '#f5ecd7',
          200: '#ecdfbe',
          300: '#dfcb99',
          400: '#ccb173',
        },
        sepia: {
          400: '#b08d5f',
          500: '#9a7749',
          600: '#8b6f47',
          700: '#6b5436',
          800: '#4a3a26',
          900: '#2d2316',
        },
        ink: {
          900: '#1a1410',
          800: '#2a211b',
        },
        cipher: {
          red: '#b91c1c',
        },
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
