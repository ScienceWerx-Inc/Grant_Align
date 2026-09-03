import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-aeonik)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-input)', 'ui-monospace', 'monospace'],
      },
      /*
       * The reference scale verbatim. Authority comes from size and negative
       * tracking rather than weight - every heading here is 400.
       */
      fontSize: {
        caption: ['13px', { lineHeight: '2.69' }],
        body: ['16px', { lineHeight: '1.25' }],
        'heading-xs': ['18px', { lineHeight: '1.31' }],
        subheading: ['21px', { lineHeight: '0.95' }],
        'heading-sm': ['23px', { lineHeight: '1.07' }],
        heading: ['34px', { lineHeight: '1.03' }],
        'heading-lg': ['44px', { lineHeight: '1.07', letterSpacing: '-0.31px' }],
        display: ['clamp(2.5rem, 5.5vw, 63px)', { lineHeight: '1.05', letterSpacing: '-0.69px' }],
      },
      maxWidth: {
        page: '1200px',
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
         * Hyperstudio reference tokens (reference_ui.md).
         *
         * An editorial-tech system: near-black canvas, hairline borders doing
         * all the structural work, and no fills beyond a single white pill.
         * Scoped to the landing and auth pages - the application stays light,
         * because a dense working tool needs different rules from a page whose
         * job is to be read once.
         */
        obsidian: '#101010',
        carbon: '#080808',
        chalk: '#f3f3f3',
        smoke: '#9c9c9c',
        ash: '#c1c1c1',
        graphite: '#212121',
        iron: '#474747',
        /* Icon strokes only - never text, never a background. */
        'compass-gold': '#6f6759',
        'card-slate': '#3b3d45',
        /* Live/active status dots only. */
        'pulse-green': '#98ff38',
      },
    },
  },
  plugins: [],
} satisfies Config;
