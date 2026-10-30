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
        /* ---- 2026 space system ---- */
        ink: {
          950: '#03050B',
          900: '#04070E',
          850: '#060A14',
          800: '#080E1B',
          750: '#0B1324',
          700: '#101A2E',
        },
        ice: {
          50: '#F4F8FF',
          100: '#EAF2FF',
          200: '#C9D7EE',
          300: '#A7B4CC',
          400: '#8391AC',
          500: '#64718A',
        },
        aqua: {
          DEFAULT: '#6FE3FF',
          100: '#C9F6FF',
          300: '#8FE9FF',
          500: '#38BDF8',
          700: '#0E7490',
        },
        bio: {
          DEFAULT: '#3DFFB0',
          400: '#5CFFC0',
          600: '#0FBF83',
        },
        signal: {
          DEFAULT: '#FFB454',
          400: '#FFC978',
        },

        /* ---- legacy tokens kept for compatibility ---- */
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
        bioteal: {
          DEFAULT: '#3DFFB0',
          glow: 'rgba(61, 255, 176, 0.25)',
          dim: 'rgba(61, 255, 176, 0.12)',
        },
      },
      fontFamily: {
        heading: ['var(--font-heading)', "'Sora Variable'", "'Sora'", 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', "'DM Sans Variable'", "'DM Sans'", 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', "'JetBrains Mono Variable'", "'JetBrains Mono'", 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-aqua': '0 0 60px -18px rgba(111, 227, 255, 0.55)',
        'glow-bio': '0 0 60px -18px rgba(61, 255, 176, 0.45)',
        'glow-signal': '0 0 50px -16px rgba(255, 180, 84, 0.45)',
        panel: '0 24px 80px -40px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        lift: '0 30px 90px -40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(111, 227, 255, 0.12)',
      },
      backgroundImage: {
        'aurora-space':
          'radial-gradient(1200px 600px at 78% -10%, rgba(56, 189, 248, 0.10), transparent 60%), radial-gradient(900px 500px at 12% 18%, rgba(61, 255, 176, 0.055), transparent 62%), radial-gradient(1100px 700px at 50% 110%, rgba(29, 78, 216, 0.10), transparent 60%)',
        'panel-sheen':
          'linear-gradient(150deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.015) 38%, rgba(255,255,255,0) 70%)',
        'hairline-x':
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
        'text-aqua': 'linear-gradient(92deg, #EAF2FF 0%, #A5EFFF 45%, #3DFFB0 100%)',
      },
      transitionTimingFunction: {
        'expo-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'swift': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.75rem',
      },
      letterSpacing: {
        'ultra': '0.26em',
      },
    },
  },
  plugins: [],
};
