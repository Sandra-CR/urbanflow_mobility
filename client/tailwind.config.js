/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        background: 'var(--color-background)',
        card: 'var(--color-card)',
        text: 'var(--color-text)',
        'text-light': 'var(--color-text-light)',
        'on-primary': 'var(--color-on-primary)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      fontSize: {
        h1: ['24px', { lineHeight: 'normal', fontWeight: '700' }],
        h2: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        h4: ['13px', { lineHeight: 'normal', fontWeight: '700' }],
        body: ['16px', { lineHeight: '22px', fontWeight: '500' }],
        small: ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },
      borderRadius: {
        ui: 'var(--radius-ui)',
      },
      boxShadow: {
        ui: 'var(--shadow-ui)',
        floating: 'var(--shadow-floating)',
      },
    },
  },
  plugins: [],
};
