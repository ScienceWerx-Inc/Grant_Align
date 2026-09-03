import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontSize: {
        // A display step above the default scale, for the hero only.
        display: ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.03', letterSpacing: '-0.03em' }],
      },
      colors: {
        ink: '#12181f',
        muted: '#5b6774',
        line: '#e3e8ee',
        surface: '#f7f9fb',
        brand: { DEFAULT: '#1f5f8b', dark: '#164a6d', light: '#e8f1f7' },
        apply: '#1a7f5a',
        maybe: '#b07d10',
        skip: '#a33a3a',

        /*
         * Landing-page palette. Scoped to its own names rather than a global
         * dark mode: the application stays light on purpose, because it is a
         * dense working tool where legibility beats atmosphere.
         *
         * Deep navy rather than black - this is a civic product for small
         * non-profits and county foundations, and pure black reads as consumer
         * fintech rather than considered.
         */
        night: {
          950: '#070b12',
          900: '#0b1120',
          800: '#111a2e',
          700: '#1b273f',
        },
        glow: '#4d9fd6',
        /* Verdict colors, lifted for contrast against a dark ground. */
        'apply-dark': '#4ade9f',
        'maybe-dark': '#f0c05a',
        'skip-dark': '#f08a8a',
      },
    },
  },
  plugins: [],
} satisfies Config;
