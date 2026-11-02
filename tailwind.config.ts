import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: { 100: "#DDEBE1", 500: "#3A7350", 700: "#1F4A30", 900: "#14301F" },
        clay:   { 100: "#F4E1D6", 600: "#B5532F" },
        paper:  { 50: "#FBF8F2", 100: "#F3EEE3", 200: "#E6DFD0" },
        ink:    { 400: "#8A867B", 600: "#5B584F", 900: "#1B1A17" },
        success: "#2F7D4F",
        warning: "#B7791F",
        danger:  "#B3372B",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        sans:    ["var(--font-inter)", "system-ui", "sans-serif"],
        mono:    ["var(--font-jetbrains)", "ui-monospace", "monospace"],
      },
      borderRadius: { sm: "4px", md: "8px" },
      maxWidth: { prose: "68ch" },
    },
  },
  plugins: [],
};
export default config;
