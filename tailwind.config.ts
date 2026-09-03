import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12181f',
        muted: '#5b6774',
        line: '#e3e8ee',
        surface: '#f7f9fb',
        brand: { DEFAULT: '#1f5f8b', dark: '#164a6d', light: '#e8f1f7' },
        apply: '#1a7f5a',
        maybe: '#b07d10',
        skip: '#a33a3a',
      },
    },
  },
  plugins: [],
} satisfies Config;
