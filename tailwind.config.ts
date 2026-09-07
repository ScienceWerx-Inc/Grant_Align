import type { Config } from 'tailwindcss';

/*
 * Warm Civic token layer.
 *
 * Every value below is a token. Screens are migrated onto it surface by
 * surface (see REDESIGN_PLAN.md §6), so the three superseded palettes are
 * still present under "LEGACY" at the bottom and are deleted in the final
 * cleanup once nothing references them. Nothing new may use a legacy token.
 *
 * Contrast was verified rather than eyeballed. Every foreground token clears
 * WCAG AA (4.5:1) on paper, card and band; the numbers are recorded beside
 * each one so a future change can be re-checked against the same bar.
 */
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-aeonik)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-input)', 'ui-monospace', 'monospace'],
      },

      /*
       * One scale, every text node uses a step. Line heights are paired here
       * so a size can never be used without the leading it was drawn with.
       */
      fontSize: {
        display: ['clamp(2.75rem, 5.5vw, 4rem)', { lineHeight: '1.04', letterSpacing: '-0.022em' }],
        h1: ['clamp(2rem, 3.6vw, 2.75rem)', { lineHeight: '1.08', letterSpacing: '-0.018em' }],
        h2: ['1.75rem', { lineHeight: '1.14', letterSpacing: '-0.014em' }],
        h3: ['1.3125rem', { lineHeight: '1.24', letterSpacing: '-0.01em' }],
        h4: ['1.0625rem', { lineHeight: '1.35', letterSpacing: '-0.006em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.6' }],
        body: ['1rem', { lineHeight: '1.6' }],
        'body-sm': ['0.875rem', { lineHeight: '1.55' }],
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        /* The "A COMMON CHALLENGE" eyebrow. Size, tracking and case as one token. */
        overline: ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.12em' }],

        /* LEGACY — remove with the screens that use them. */
        'heading-xs': ['18px', { lineHeight: '1.31' }],
        subheading: ['21px', { lineHeight: '0.95' }],
        'heading-sm': ['23px', { lineHeight: '1.07' }],
        heading: ['34px', { lineHeight: '1.03' }],
        'heading-lg': ['44px', { lineHeight: '1.07', letterSpacing: '-0.31px' }],
      },

      maxWidth: {
        page: '75rem',
        /* Body copy capped at a readable measure rather than the grid width. */
        prose: '68ch',
      },

      width: {
        /*
         * The verdict column. "Worth a look" is twice the length of "Apply",
         * so the badge is fixed-width to stop every row in a list starting its
         * text at a different x position. A token because the live-run list
         * renders a "not scored" placeholder into the same column, and the two
         * silently drifted apart when the badge was last resized.
         */
        verdict: '8.5rem',
      },

      borderRadius: {
        control: '0.375rem',
        card: '0.75rem',
        panel: '1.25rem',
        pill: '9999px',

        /* LEGACY */
        'com-cards': '24px',
        'com-buttons': '24px',
      },

      boxShadow: {
        /* Warm-tinted and soft. Elevation is carried by surface and border
         * first; these exist for things that genuinely float. */
        raised: '0 1px 2px 0 rgb(41 37 28 / 0.04), 0 1px 3px 0 rgb(41 37 28 / 0.06)',
        overlay: '0 4px 12px -2px rgb(41 37 28 / 0.08), 0 2px 6px -2px rgb(41 37 28 / 0.06)',
        modal: '0 16px 40px -8px rgb(41 37 28 / 0.16), 0 6px 16px -6px rgb(41 37 28 / 0.10)',
      },

      transitionDuration: {
        fast: '150ms',
        DEFAULT: '200ms',
        slow: '250ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0, 0.2, 1)',
      },

      colors: {
        /* ---- Surfaces: warm paper, not white, not cool grey ---- */
        paper: '#FAF9F5',
        card: '#FFFFFF',
        band: '#F2F0E9',
        sink: '#E9E6DC',

        /* ---- Ink: warm near-black ramp ----
         * paper / card / band contrast, in order:
         *   ink       16.48 / 17.36 / 15.23
         *   ink-body  12.13 / 12.77 / 11.20
         *   ink-muted  6.13 /  6.45 /  5.66
         *   ink-faint  4.25 /  4.47 /  3.92   (placeholder + disabled only)
         */
        ink: {
          DEFAULT: '#1C1A17',
          body: '#35322C',
          muted: '#635E52',
          faint: '#7C7768',
        },

        /* ---- Lines ----
         * `line` is decorative (dividers, card edges). `control` is the border
         * of an interactive element, so it carries real weight: a civic form
         * field reads as a field because of its edge, the way GOV.UK's does.
         */
        line: {
          DEFAULT: '#E3E0D6',
          strong: '#CFCBBE',
          control: '#7C7768',
        },

        /* ---- Brand ----
         * `brand` is a fill colour: white on it is 4.65:1. As *text* on paper
         * it is 4.42:1 and misses AA, so text and links use `brand.ink`.
         */
        brand: {
          DEFAULT: '#20845B',
          ink: '#1A6B4A',
          hover: '#1A6B4A',
          active: '#145339',
          tint: '#E8F3EA',
          on: '#FFFFFF',
          /* LEGACY aliases — `.btn-primary` and `.chip` still reference these. */
          dark: '#1A6B4A',
          light: '#E8F3EA',
        },

        /* ---- Accent: used sparingly, for emphasis and data highlight ---- */
        accent: {
          DEFAULT: '#B34A28',
          tint: '#FBEBE2',
          on: '#FFFFFF',
        },

        /* ---- Semantic ---- */
        success: { DEFAULT: '#1B6E45', tint: '#E4F1E9', on: '#FFFFFF' },
        warning: { DEFAULT: '#7A5610', tint: '#F9EFD8', on: '#FFFFFF' },
        danger: { DEFAULT: '#9B3427', tint: '#FAE9E6', on: '#FFFFFF' },
        info: { DEFAULT: '#1F5F8B', tint: '#E8F1F7', on: '#FFFFFF' },

        /* ---- Verdicts ----
         * Muted and distinct, and never load-bearing on their own: every
         * verdict ships an icon and a text label alongside the colour.
         */
        verdict: {
          apply: '#1B6E45',
          'apply-tint': '#E4F1E9',
          maybe: '#7A5610',
          'maybe-tint': '#F9EFD8',
          skip: '#8C4034',
          'skip-tint': '#F5E8E4',
        },

        /* ================= LEGACY =================
         * Superseded. Deleted once §6 step 15 reports zero references.
         */
        'com-ivory': '#F8F8F4',
        'com-navy': '#102A43',
        'com-green': '#20845B',
        'com-light-green': '#E8F3EA',
        'com-coral': '#F07A55',
        'com-light-peach': '#FCEDE5',
        'com-border': '#E2E7E3',

        muted: '#5b6774',
        surface: '#f7f9fb',
        apply: '#1a7f5a',
        maybe: '#b07d10',
        skip: '#a33a3a',
      },
    },
  },
  plugins: [],
} satisfies Config;
