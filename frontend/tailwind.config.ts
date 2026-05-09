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
      },
    },
  },
  plugins: [],
};

export default config;
