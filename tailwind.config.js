/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neutral scale — the whole system is built from these.
        ink: '#111111',
        'ink-soft': '#1A1A1A',
        muted: '#6B6B6B',
        faint: '#9B9B9B',
        line: '#ECECEC',
        fill: '#F4F4F4',
        surface: '#FAFAFA',
        canvas: '#EFEEEE',
        // The only chromatic accent in the system: availability.
        available: '#16A34A',
      },
      fontFamily: {
        sans: ['var(--font-geist)', 'Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        micro: ['11px', { lineHeight: '1.2', letterSpacing: '0.07em' }],
        label: ['12.5px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
      },
      borderColor: {
        DEFAULT: '#ECECEC',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.04)',
        raised: '0 4px 16px rgba(0,0,0,0.06)',
      },
      keyframes: {
        // The indeterminate sweep on the discovery "reviewing" screen.
        bar: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(320%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        bar: 'bar 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s ease both',
        'fade-in': 'fade-in 0.3s ease both',
      },
    },
  },
  plugins: [],
};
