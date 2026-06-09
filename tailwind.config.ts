import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "nbx-bg": "rgb(var(--nbx-bg) / <alpha-value>)",
        "nbx-bg-2": "rgb(var(--nbx-bg-2) / <alpha-value>)",
        "nbx-text": "rgb(var(--nbx-text) / <alpha-value>)",
        "nbx-surface": "rgb(var(--nbx-surface) / <alpha-value>)",
        "nbx-ink": "rgb(var(--nbx-ink) / <alpha-value>)",
        "nbx-green": "rgb(var(--nbx-green) / <alpha-value>)",
        "nbx-purple": "rgb(var(--nbx-purple) / <alpha-value>)",
        "nbx-yellow": "rgb(var(--nbx-yellow) / <alpha-value>)",
      },
      fontFamily: {
        cabinet: ['"Cabinet Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
        switzer: ['"Switzer"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        nbx: "28px",
        "nbx-lg": "36px",
        "nbx-xl": "44px",
      },
      maxWidth: {
        form: "960px",
      },
      letterSpacing: {
        kicker: "0.18em",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-right": {
          "0%": { transform: "translateX(-6px)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.21, 0.61, 0.35, 1) both",
        "fade-up-slow": "fade-up 0.7s cubic-bezier(0.21, 0.61, 0.35, 1) both",
        "fade-in": "fade-in 0.4s ease-out both",
        "slide-right": "slide-right 0.5s ease-out both",
        breathe: "breathe 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
