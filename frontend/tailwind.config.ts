import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(214, 32%, 91%)",
        bg: "hsl(0, 0%, 100%)",
        muted: "hsl(210, 40%, 96%)",
        fg: "hsl(222, 47%, 11%)",
        accent: "hsl(221, 83%, 53%)",
        "accent-soft": "hsl(221, 83%, 96%)",
        "accent-2": "hsl(262, 83%, 58%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.06)",
        lift: "0 10px 30px -12px rgba(37, 99, 235, 0.35)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, hsl(221, 83%, 53%), hsl(262, 83%, 58%))",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pop-in": {
          "0%": { opacity: "0", transform: "scale(0.85)" },
          "60%": { opacity: "1", transform: "scale(1.08)" },
          "100%": { transform: "scale(1)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(0deg)" },
          "25%": { transform: "rotate(-6deg)" },
          "75%": { transform: "rotate(6deg)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.8)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.35s ease-out both",
        "pop-in": "pop-in 0.25s ease-out both",
        wiggle: "wiggle 0.4s ease-in-out",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
