import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // === Accent barva — změn zde ===
        'accent':       '#fbbf24',  // amber-400
        'accent-hover': '#fde68a',  // amber-200
        'accent-dark':  '#92400e',  // amber-900
      },
    },
  },
  plugins: [],
};
export default config;
