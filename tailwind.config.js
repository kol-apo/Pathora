/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: '#0F1F3D',
        'navy-mid': '#1C3461',
        amber: {
          DEFAULT: '#E8A020',
          light: '#FDF3E0',
          dark: '#B87A10',
        },
        cream: '#FAFAF7',
        'warm-gray': '#F5F3EE',
        forest: {
          DEFAULT: '#1A6B4A',
          light: '#E6F4EE',
        },
        'text-main': '#1A1A1A',
        'text-muted': '#6B6860',
        'text-light': '#A09D96',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'Fraunces', 'serif'],
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
      },
      borderColor: {
        DEFAULT: 'rgba(0,0,0,0.08)',
      },
      boxShadow: {
        card: '0 8px 24px rgba(15,31,61,0.06)',
        'card-hover': '0 16px 40px rgba(15,31,61,0.10)',
        modal: '0 20px 60px rgba(0,0,0,0.08)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-left': {
          '0%': { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.9)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease both',
        'fade-in': 'fade-in 0.4s ease both',
        'slide-left': 'slide-left 0.35s ease both',
        'pulse-soft': 'pulse-soft 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
