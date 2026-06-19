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
        // Base surfaces
        bg: "#0a0b0d",
        surface: "#111318",
        "surface-2": "#181c23",
        "surface-3": "#1e2330",
        border: "#252b38",
        "border-subtle": "#1a1f2a",
        // Text
        "text-primary": "#e8eaf0",
        "text-secondary": "#8b92a8",
        "text-muted": "#4a5068",
        // Accent
        accent: "#3b82f6",
        "accent-dim": "#1d4ed8",
        "accent-glow": "rgba(59,130,246,0.15)",
        // Tier colors
        tier: {
          untrusted: "#ef4444",
          emerging: "#f59e0b",
          established: "#3b82f6",
          prime: "#10b981",
        },
        // Tier bg (subtle)
        "tier-bg": {
          untrusted: "rgba(239,68,68,0.12)",
          emerging: "rgba(245,158,11,0.12)",
          established: "rgba(59,130,246,0.12)",
          prime: "rgba(16,185,129,0.12)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)",
        "card-hover": "0 4px 16px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.2)",
        glow: "0 0 24px rgba(59,130,246,0.15)",
      },
      animation: {
        "score-up": "scoreUp 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards",
        "fade-in": "fadeIn 0.4s ease forwards",
        "slide-up": "slideUp 0.4s ease forwards",
        pulse2: "pulse2 2s ease-in-out infinite",
      },
      keyframes: {
        scoreUp: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
