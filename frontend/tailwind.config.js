/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        leaf: "#0f766e",
        amberline: "#f59e0b",
        mist: "#f8fafc"
      },
      boxShadow: {
        soft: "0 12px 35px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
