/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      colors: {
        surface: {
          0: '#07090E',
          1: '#0C0F17',
          2: '#111520',
          3: '#161B28',
          4: '#1C2235',
          5: '#232A3E',
        },
        border: {
          DEFAULT: '#1E2435',
          bright: '#2D3452',
          subtle: '#141826',
        },
        accent: {
          DEFAULT: '#6366F1',
          50: 'rgba(99,102,241,0.05)',
          100: 'rgba(99,102,241,0.10)',
          200: 'rgba(99,102,241,0.20)',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
        },
        cyan: {
          DEFAULT: '#06B6D4',
          subtle: 'rgba(6,182,212,0.10)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.8)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};
