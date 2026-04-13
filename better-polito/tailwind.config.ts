import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ElevenLabs design tokens
        "el-white": "#ffffff",
        "el-light": "#f5f5f5",
        "el-warm": "#f5f2ef",
        "el-black": "#000000",
        "el-dark": "#4e4e4e",
        "el-warm-gray": "#777169",
        "el-border": "#e5e5e5",
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["Inter", "Inter Fallback", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "el-card": "rgba(0,0,0,0.4) 0px 0px 1px, rgba(0,0,0,0.04) 0px 4px 4px",
        "el-warm": "rgba(78,50,23,0.04) 0px 6px 16px",
        "el-inset": "rgba(0,0,0,0.075) 0px 0px 0px 0.5px inset",
        "el-outline": "rgba(0,0,0,0.06) 0px 0px 0px 1px",
        "el-soft": "rgba(0,0,0,0.04) 0px 4px 4px",
        "el-edge": "rgba(0,0,0,0.08) 0px 0px 0px 0.5px",
        "el-ring-inset": "rgba(0,0,0,0.1) 0px 0px 0px 1px inset",
      },
      borderRadius: {
        pill: "9999px",
        "warm-button": "30px",
        card: "16px",
        "card-md": "20px",
        "card-lg": "24px",
      },
      letterSpacing: {
        "body-sm": "0.14px",
        "body": "0.16px",
        "body-lg": "0.18px",
        "nav": "0.15px",
        "upper-btn": "0.7px",
      },
    },
  },
  plugins: [],
};

export default config;
