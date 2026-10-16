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
        // Brand colours, taken from the Pathora logo.
        // navy carries buttons, active states and selected states.
        navy: {
          DEFAULT: '#1D3F5A',
          deep: '#152E42', // hover / pressed
        },
        // sky is for fills and highlights only: on white it is too faint for
        // text (about 1.7:1 contrast), so text on a sky fill is always navy.
        sky: {
          DEFAULT: '#96CAD3',
          muted: '#D5EAED', // tracks, dividers on tinted surfaces
          soft: '#EFF7F8', // tinted panels, selected rows, chips
        },
        // Reserved for availability / online state only. Never use it as decoration.
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
        // The Guide's body slowly changes shape.
        blob: {
          '0%, 100%': { borderRadius: '58% 42% 46% 54% / 52% 48% 52% 48%' },
          '33%': { borderRadius: '44% 56% 58% 42% / 58% 44% 56% 42%' },
          '66%': { borderRadius: '52% 48% 40% 60% / 44% 56% 46% 54%' },
        },
        'guide-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'guide-bounce': {
          '0%, 100%': { transform: 'translateY(0) scale(1, 1)' },
          '40%': { transform: 'translateY(-5px) scale(0.97, 1.03)' },
          '70%': { transform: 'translateY(0) scale(1.03, 0.97)' },
        },
        blink: {
          '0%, 91%, 100%': { transform: 'scaleY(1)' },
          '94%': { transform: 'scaleY(0.08)' },
        },
        // For SVG paths with pathLength="1": draws the line from start to end.
        draw: {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)', opacity: '0.35' },
          '30%': { transform: 'translateY(-3px)', opacity: '1' },
        },
        'card-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        bar: 'bar 1.6s ease-in-out infinite',
        'fade-up': 'fade-up 0.45s ease both',
        'fade-in': 'fade-in 0.3s ease both',
        blob: 'blob 9s ease-in-out infinite',
        'blob-fast': 'blob 2.8s ease-in-out infinite',
        'guide-float': 'guide-float 4.5s ease-in-out infinite',
        'guide-bounce': 'guide-bounce 0.9s ease-in-out infinite',
        blink: 'blink 5.5s ease-in-out infinite',
        draw: 'draw 1.8s cubic-bezier(0.65, 0, 0.35, 1) both',
        typing: 'typing 1.2s ease-in-out infinite',
        'card-float': 'card-float 6s ease-in-out infinite',
        'pop-in': 'pop-in 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both',
      },
    },
  },
  plugins: [],
};
