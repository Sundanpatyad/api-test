/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // SyncNest dark palette
        surface: {
          50:  'hsl(220, 13%, 95%)',
          100: 'hsl(220, 13%, 91%)',
          200: 'hsl(220, 13%, 80%)',
          300: 'hsl(220, 13%, 65%)',
          400: 'hsl(220, 13%, 50%)',
          500: 'hsl(220, 13%, 35%)',
          600: 'hsl(220, 13%, 25%)',
          700: 'hsl(220, 14%, 18%)',
          750: 'hsl(220, 14%, 14%)',
          800: 'hsl(220, 15%, 11%)',
          850: 'hsl(220, 16%, 9%)',
          900: 'hsl(220, 17%, 7%)',
          950: 'hsl(220, 18%, 5%)',
        },
        brand: {
          50:  'hsl(250, 100%, 97%)',
          100: 'hsl(250, 95%, 92%)',
          200: 'hsl(250, 90%, 82%)',
          300: 'hsl(250, 85%, 70%)',
          400: 'hsl(250, 80%, 60%)',
          500: 'hsl(250, 75%, 52%)', // Primary
          600: 'hsl(250, 70%, 45%)',
          700: 'hsl(250, 65%, 38%)',
          800: 'hsl(250, 60%, 30%)',
          900: 'hsl(250, 55%, 22%)',
        },
        success: { DEFAULT: 'hsl(142, 71%, 45%)', dark: 'hsl(142, 71%, 35%)' },
        warning: { DEFAULT: 'hsl(38, 92%, 50%)', dark: 'hsl(38, 92%, 40%)' },
        danger:  { DEFAULT: 'hsl(0, 84%, 60%)', dark: 'hsl(0, 84%, 50%)' },
        info:    { DEFAULT: 'hsl(199, 89%, 48%)', dark: 'hsl(199, 89%, 38%)' },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in':      'fadeIn 0.2s ease-in-out',
        'slide-in-left':'slideInLeft 0.3s ease-out',
        'slide-in-right':'slideInRight 0.3s ease-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'pulse-slow':   'pulse 3s infinite',
        'spin-slow':    'spin 3s linear infinite',
        'bounce-subtle':'bounceSubtle 1s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:       { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideInLeft:  { '0%': { transform: 'translateX(-20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        slideUp:      { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bounceSubtle: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      boxShadow: {
        'glass':    '0 4px 30px rgba(0, 0, 0, 0.4)',
        'glow':     '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-lg':  '0 0 40px rgba(139, 92, 246, 0.4)',
        'inner-lg': 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
