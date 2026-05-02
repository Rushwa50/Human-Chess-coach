/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201a",
        field: "#f3f0e8",
        moss: "#4d674f",
        clay: "#b35f42",
        gold: "#d9a441"
      }
    }
  },
  plugins: []
};
