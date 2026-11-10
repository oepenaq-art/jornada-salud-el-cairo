import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        teja: {
          50: "#fdf4f1",
          100: "#fbe6df",
          200: "#f7d1c4",
          300: "#f0b19c",
          400: "#e68565",
          500: "#d95f38",
          600: "#d25427", // Color principal logo "Tejas"
          700: "#a83c1b",
          800: "#8b331a",
          900: "#722d1a",
        },
        pueblo: {
          50: "#f3f8f2",
          100: "#e2efe0",
          200: "#c6dfc3",
          300: "#9bc697",
          400: "#6ca667",
          500: "#498844",
          600: "#356530", // Color principal logo "Pueblo"
          700: "#2c5528",
          800: "#264423",
          900: "#20381e",
        },
        calado: {
          yellow: "#FACC15",
          blue: "#38BDF8",
          red: "#EF4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
