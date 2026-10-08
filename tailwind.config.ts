import type { Config } from "tailwindcss";
export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        ink2: "rgb(var(--ink2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        glass: "rgb(var(--glass) / <alpha-value>)",
        glassink: "rgb(var(--glassink) / <alpha-value>)",
        protein: "rgb(var(--protein) / <alpha-value>)",
        carbs: "rgb(var(--carbs) / <alpha-value>)",
        fat: "rgb(var(--fat) / <alpha-value>)",
        water: "rgb(var(--water) / <alpha-value>)",
        over: "rgb(var(--over) / <alpha-value>)",
        onaccent: "rgb(var(--onaccent) / <alpha-value>)",
        device: "rgb(var(--device) / <alpha-value>)",
        devicetext: "rgb(var(--devicetext) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
        lcd: ["Doto", "ui-monospace", "monospace"],
      },
      borderRadius: { device: "28px" },
    },
  },
  plugins: [],
} satisfies Config;
