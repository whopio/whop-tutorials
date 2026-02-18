import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefff4",
          100: "#d7ffe7",
          200: "#b2ffd0",
          300: "#76ffab",
          400: "#33f57f",
          500: "#08de5a",
          600: "#00b948",
          700: "#04913c",
          800: "#0a7133",
          900: "#0a5d2c",
          950: "#003416",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
