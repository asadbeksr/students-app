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
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        surface: "hsl(var(--card))",
        "surface-warm": "hsl(var(--card))",
        "text-muted": "hsl(var(--muted-foreground))",
        arc: {
          pink: "hsl(var(--arc-pink))",
          blue: "hsl(var(--arc-blue))",
          purple: "hsl(var(--arc-purple))",
          mint: "hsl(var(--arc-mint))",
          orange: "hsl(var(--arc-orange))",
          canvas: "#FAF9F6",
        },
      },
      fontFamily: {
        sans: ["Inter", "Inter Fallback", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        "el-card": "var(--shadow-card)",
        "el-warm": "var(--shadow-warm)",
        "el-inset": "var(--shadow-inset)",
        "el-outline": "var(--shadow-outline)",
        "el-soft": "var(--shadow-soft)",
        "el-edge": "var(--shadow-edge)",
        "el-ring-inset": "var(--shadow-ring-inset)",
        "glass": "0 8px 32px rgba(0,0,0,0.06)",
        "glass-lg": "0 24px 64px rgba(0,0,0,0.10)",
        "arc-sticker": "0 4px 12px rgba(0,0,0,0.10)",
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
