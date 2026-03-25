import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-roboto)", "Segoe UI", "sans-serif"]
      },
      colors: {
        ink: "#3b1c1c",
        canvas: "#fffbf0",
        crimson: "#981c1d",
        rose: "#dc7291",
        gold: "#f4b942",
        midnight: "#4a0e0e"
      },
      boxShadow: {
        lift: "0 24px 60px rgba(74, 14, 14, 0.14)"
      },
      borderRadius: {
        panel: "1.75rem"
      }
    }
  },
  plugins: []
};

export default config;
