import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base obsidian + glass layers (see globals.css :root)
        bg: "#070810",
        "bg-2": "#0a0c16",
        surface: "rgba(255,255,255,0.025)",
        "surface-2": "rgba(255,255,255,0.045)",
        "surface-3": "rgba(255,255,255,0.07)",
        hairline: "rgba(255,255,255,0.08)",
        "hairline-strong": "rgba(255,255,255,0.14)",
        // Text
        "text-primary": "#eef0fb",
        "text-secondary": "#9aa0c0",
        "text-muted": "#5a607e",
        // Brand duotone + gold
        iris: "#7c83ff",
        violet: "#a855f7",
        cyan: "#22d3ee",
        gold: "#e9c98a",
        // Back-compat accent aliases (map to iris)
        accent: "#7c83ff",
        "accent-dim": "#6366f1",
        // Tier hues
        tier: {
          untrusted: "#fb7185",
          emerging: "#fbbf24",
          established: "#818cf8",
          prime: "#2dd4bf",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "sans-serif"],
        serif: ["Instrument Serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "18px",
        xl2: "22px",
      },
      boxShadow: {
        card: "0 8px 30px -16px rgba(0,0,0,0.7)",
        "card-hover": "0 18px 50px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.14)",
        glow: "0 12px 40px -12px rgba(124,131,255,0.5)",
        "glow-cyan": "0 12px 40px -12px rgba(34,211,238,0.45)",
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(110deg,#7c83ff,#a855f7 60%,#22d3ee)",
        "gold-grad": "linear-gradient(105deg,#fff6df,#e9c98a 45%,#c79a4e)",
      },
      animation: {
        "fade-up": "fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards",
        "score-up": "scoreCountUp 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards",
        float: "float 5s ease-in-out infinite",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { transform: "translateY(16px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scoreCountUp: {
          "0%": { transform: "translateY(10px) scale(0.94)", opacity: "0" },
          "100%": { transform: "translateY(0) scale(1)", opacity: "1" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulse2: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
