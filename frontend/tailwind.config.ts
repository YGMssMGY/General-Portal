import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f5faf8",
        primary: "#00685f",
        "primary-container": "#008378",
        "primary-fixed": "#89f5e7",
        "primary-fixed-dim": "#6bd8cb",
        secondary: "#4b41e1",
        "secondary-container": "#645efb",
        "secondary-fixed": "#e2dfff",
        tertiary: "#924628",
        "tertiary-container": "#b05e3d",
        "tertiary-fixed": "#ffdbce",
        surface: "#f5faf8",
        "surface-bright": "#f5faf8",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f0f5f2",
        "surface-container": "#eaefed",
        "surface-container-high": "#e4e9e7",
        "surface-container-highest": "#dee4e1",
        "surface-variant": "#dee4e1",
        outline: "#6d7a77",
        "outline-variant": "#bcc9c6",
        "on-background": "#171d1c",
        "on-surface": "#171d1c",
        "on-surface-variant": "#3d4947",
        "on-primary": "#ffffff",
        "on-primary-container": "#f4fffc",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#fffbff",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#fffbff",
        error: "#ba1a1a",
        "error-container": "#ffdad6",
        "on-error": "#ffffff",
        "on-error-container": "#93000a"
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem"
      },
      spacing: {
        "sidebar-width": "280px",
        "topbar-height": "64px",
        gutter: "24px",
        "card-padding": "20px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
        display: ["Plus Jakarta Sans", "Inter", "ui-sans-serif", "system-ui"]
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04)",
        popover: "0 4px 12px rgba(15, 23, 42, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
