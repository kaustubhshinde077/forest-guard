/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          DEFAULT: '#05070a',
          surface: '#0a0e17',
          panel: '#0e1420',
          card: '#121927',
        },
        main: '#e8ecef',
        muted: '#8a949c',
        dim: '#5b6573',
        hairline: 'rgba(255, 255, 255, 0.10)',
        
        forest: {
          DEFAULT: '#1f6f4a',
          dark: '#144c32',
          light: '#2d8f61',
        },
        emerald: {
          DEFAULT: '#34d399',
          glow: 'rgba(52, 211, 153, 0.20)',
        },
        lime: {
          DEFAULT: '#b6f23a',
        },
        candidate: {
          DEFAULT: '#f5a524',
          subtle: 'rgba(245, 165, 36, 0.12)',
        },
        cloud: {
          DEFAULT: '#7c8aa5',
        },
        failure: {
          DEFAULT: '#e5484d',
        },
        pending: {
          DEFAULT: '#5b6573',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter Tight', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
