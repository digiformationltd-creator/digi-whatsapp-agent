/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/frontend/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        wa: {
          light: "#25D366",
          DEFAULT: "#128C7E",
          dark: "#075E54",
          teal: "#00A884",
          bg: "#0B1015",
          card: "#111B21",
          hover: "#1A2730",
          border: "#202C33",
        }
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
