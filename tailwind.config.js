/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Healthcare color scheme - White and Red
        medical: {
          red: {
            light: '#FF6B6B',
            DEFAULT: '#E74C3C',
            dark: '#C0392B',
          },
          white: '#FFFFFF',
          gray: {
            light: '#F8F9FA',
            DEFAULT: '#E9ECEF',
            dark: '#6C757D',
          },
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'dwell': 'dwell 2s linear forwards',
      },
      keyframes: {
        dwell: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: '0' },
        },
      },
    },
  },
  plugins: [],
}
