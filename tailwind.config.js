/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Optimize font display for faster rendering
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      // Accessibility extensions
      aria: {
        'busy': 'aria-busy="true"',
        'pressed': 'aria-pressed="true"',
        'checked': 'aria-checked="true"',
        'expanded': 'aria-expanded="true"',
        'selected': 'aria-selected="true"',
      },
    },
  },
  plugins: [],
  // Purge CSS in production for smaller bundle
  // This is handled automatically by Vite in production builds
}
