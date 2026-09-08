import Link from 'next/link';
import type { MatchVerdict } from '@prisma/client';
import { cn } from '@/lib/cn';
import {
  IconApply,
  IconBlocker,
  IconCompliance,
  IconExclusions,
  IconGeography,
  IconInfo,
  IconMaybe,
  IconMission,
  IconPopulation,
  IconSize,
  IconSkip,
  IconSpinner,
  type IconProps,
} from '@/components/icons';

/**
 * The primitive layer.
 *
 * Everything here draws only from the tokens in tailwind.config.ts. A screen
 * that needs a colour, size or radius reaches for a primitive or a token, and
 * never for a raw value - that rule is what keeps a second design system from
 * growing back (see REDESIGN_PLAN.md §2 for what happened last time).
 *
 * These are server components. Anything needing state lives in ui-client.tsx.
 */

/* ========================================================== layout & text */

export function Overline({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('eyebrow', className)}>{children}</p>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-h2 font-medium tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="measure mt-1.5 text-body-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action && <div className="no-print flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

/**
 * A banded page section. Alternating `band` against `paper` is what gives the
 * marketing pages rhythm without resorting to a different background colour
 * per section.
 */
export function Section({
  tone = 'paper',
  children,
  className,
}: {
  tone?: 'paper' | 'band' | 'card';
  children: React.ReactNode;
  className?: string;
}) {
  const tones = { paper: 'bg-paper', band: 'bg-band', card: 'bg-card' } as const;
  return (
    <section className={cn('border-t border-line py-16 md:py-24', tones[tone], className)}>
      <div className="mx-auto max-w-page px-6">{children}</div>
    </section>
  );
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card', className)}>
      {title && (
        <div className="card-header">
          <h2 className="card-title">{title}</h2>
          {action && <div className="no-print">{action}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

/* ================================================================ buttons */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  link: 'btn-link',
};

const BUTTON_SIZE: Record<ButtonSize, string> = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/**
 * Class string for a button-shaped thing.
 *
 * Exported separately because roughly half the buttons in this app are
 * `<Link>`s or server-action `<button>`s that cannot take a component wrapper
 * without changing behaviour, and those must still land on the same styles.
 */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(BUTTON_VARIANT[variant], size !== 'md' && BUTTON_SIZE[size]);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  children,
  className,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: (p: IconProps) => React.ReactElement;
  children: React.ReactNode;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      // Announce the busy state rather than only showing a spinner, so it is
      // not purely visual for anyone using a screen reader.
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant, size), className)}
    >
      {loading ? <IconSpinner /> : Icon ? <Icon /> : null}
      {children}
    </button>
  );
}

/** Icon-only. Takes a mandatory `label` because there is no text to fall back on. */
export function IconButton({
  icon: Icon,
  label,
  className,
  ...rest
}: {
  icon: (p: IconProps) => React.ReactElement;
  label: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} aria-label={label} title={label} className={cn('btn-icon', className)}>
      <Icon />
    </button>
  );
}

/* ================================================================== forms */

export function FieldShell({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && (
        <p className="field-hint" id={`${htmlFor}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${htmlFor}-error`} role="alert">
          <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({
  label,
  className,
  ...rest
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 text-body-sm text-ink-body',
        rest.disabled && 'cursor-not-allowed opacity-55',
        className,
      )}
    >
      <input
        type="checkbox"
        {...rest}
        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-line-control text-brand
                   focus:ring-2 focus:ring-brand/25"
      />
      <span>{label}</span>
    </label>
  );
}

/**
 * A radio drawn as a selectable card. The signup role picker already worked
 * this way; this makes it the system's radio rather than one screen's idea.
 */
export function RadioCard({
  label,
  description,
  className,
  ...rest
}: {
  label: string;
  description?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-control border border-line-strong bg-card',
        'px-3.5 py-3 text-body-sm transition hover:border-ink-muted hover:bg-band',
        'has-[:checked]:border-brand has-[:checked]:bg-brand-tint',
        className,
      )}
    >
      <input
        type="radio"
        {...rest}
        className="mt-0.5 h-4 w-4 shrink-0 border-line-control text-brand focus:ring-2 focus:ring-brand/25"
      />
      <span>
        <span className="block font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-caption text-ink-muted">{description}</span>}
      </span>
    </label>
  );
}

/** Renders a value, or an explicit "not captured yet" rather than blank space. */
export function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={value ? 'whitespace-pre-wrap text-body-sm text-ink-body' : 'field-empty'}>
        {value || 'Not captured yet'}
      </dd>
    </div>
  );
}

export function Tags({ items, empty = 'None recorded' }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <span className="field-empty">{empty}</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item} className="chip">
          {item}
        </span>
      ))}
    </div>
  );
}

/**
 * Document status.
 *
 * Same grammar as a verdict - tinted pill, icon, and the status word itself -
 * because "verified" and "missing" carry the same weight here that "apply" and
 * "skip" do on a match: a missing mandatory document is disqualifying.
 *
 * The caller passes the label, so the wording stays whatever the screen
 * already said rather than being invented here.
 */
const STATUS_TONE: Record<string, { style: string; icon: (p: IconProps) => React.ReactElement }> = {
  VERIFIED: { style: 'bg-success-tint text-success ring-success/25', icon: IconApply },
  PENDING: { style: 'bg-warning-tint text-warning ring-warning/25', icon: IconMaybe },
  MISSING: { style: 'bg-danger-tint text-danger ring-danger/25', icon: IconBlocker },
  EXPIRED: { style: 'bg-danger-tint text-danger ring-danger/25', icon: IconBlocker },
};

export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone = STATUS_TONE[status] ?? {
    style: 'bg-band text-ink-muted ring-line-strong',
    icon: IconInfo,
  };
  const Glyph = tone.icon;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-0.5',
        'text-caption font-semibold ring-1',
        tone.style,
      )}
    >
      <Glyph className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}

/**
 * The negative-scope editor.
 *
 * What an organization does NOT do, and what a funder will NOT fund, is the
 * thing this product knows that a mission statement does not - so those fields
 * are drawn as their own panel rather than as two more boxes in a grid of six.
 *
 * It carries no heading of its own on purpose. The field labels already say
 * "do NOT", and inventing a section title here would be putting words in the
 * product's mouth. The accent edge does the work instead.
 */
export function NegativeScopePanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-control border border-accent/30 bg-accent-tint/60 p-4">
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

/* =============================================================== feedback */

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const ALERT_TONE: Record<AlertTone, { wrap: string; icon: string }> = {
  info: { wrap: 'border-info/25 bg-info-tint', icon: 'text-info' },
  success: { wrap: 'border-success/25 bg-success-tint', icon: 'text-success' },
  warning: { wrap: 'border-warning/25 bg-warning-tint', icon: 'text-warning' },
  danger: { wrap: 'border-danger/25 bg-danger-tint', icon: 'text-danger' },
};

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  children?: React.ReactNode;
}) {
  const style = ALERT_TONE[tone];
  const Glyph = tone === 'danger' || tone === 'warning' ? IconBlocker : IconInfo;
  return (
    <div
      className={cn('flex gap-3 rounded-control border px-4 py-3', style.wrap)}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <Glyph className={cn('mt-0.5 h-4 w-4 shrink-0', style.icon)} />
      <div className="text-body-sm text-ink-body">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-card px-6 py-12 text-center">
      <p className="text-body font-medium text-ink">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-md text-body-sm text-ink-muted">{hint}</p>}
      {cta && <div className="mt-5 flex justify-center gap-2">{cta}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        'card h-full px-5 py-4 transition',
        href && 'hover:border-brand/45 hover:shadow-raised',
      )}
    >
      <div className="text-h2 font-medium tracking-tight tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-caption text-ink-muted">{label}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="rounded-card">
      {body}
    </Link>
  ) : (
    body
  );
}

/* ================================================================ verdict */

const VERDICT_STYLE: Record<MatchVerdict, string> = {
  APPLY: 'bg-verdict-apply-tint text-verdict-apply ring-verdict-apply/25',
  MAYBE: 'bg-verdict-maybe-tint text-verdict-maybe ring-verdict-maybe/25',
  SKIP: 'bg-verdict-skip-tint text-verdict-skip ring-verdict-skip/25',
};

const VERDICT_LABEL: Record<MatchVerdict, string> = {
  APPLY: 'Apply',
  MAYBE: 'Worth a look',
  SKIP: 'Skip',
};

const VERDICT_ICON: Record<MatchVerdict, (p: IconProps) => React.ReactElement> = {
  APPLY: IconApply,
  MAYBE: IconMaybe,
  SKIP: IconSkip,
};

export function VerdictBadge({ verdict, score }: { verdict: MatchVerdict; score?: number }) {
  const Glyph = VERDICT_ICON[verdict];
  return (
    <span
      // Fixed width and no wrapping: "Worth a look" is twice the length of
      // "Apply", and letting badges size to their content left every row in a
      // list starting its text at a different x position.
      className={cn(
        'inline-flex w-verdict shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill',
        'px-2.5 py-1 text-caption font-semibold ring-1',
        VERDICT_STYLE[verdict],
      )}
    >
      <Glyph className="h-3.5 w-3.5 shrink-0" />
      <span>{VERDICT_LABEL[verdict]}</span>
      {score !== undefined && <span className="ml-auto tabular-nums opacity-75">{score}</span>}
    </span>
  );
}

/* ============================================================= dimensions */

/**
 * Icon per scoring dimension, keyed to DIMENSIONS in scoreMatch.ts.
 *
 * Keyed rather than positional so that adding a dimension to the engine
 * surfaces here as a missing key instead of silently shifting every icon by one.
 */
export const DIMENSION_ICON: Record<string, (p: IconProps) => React.ReactElement> = {
  mission: IconMission,
  population: IconPopulation,
  geography: IconGeography,
  exclusions: IconExclusions,
  size: IconSize,
  compliance: IconCompliance,
};

/**
 * A 0-100 bar.
 *
 * The band thresholds are presentational only - they describe how a number
 * looks, and have no bearing on the verdict, which the engine decides.
 */
export function ScoreMeter({
  score,
  label,
  size = 'md',
}: {
  score: number;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone =
    clamped >= 70 ? 'bg-verdict-apply' : clamped >= 40 ? 'bg-verdict-maybe' : 'bg-verdict-skip';
  return (
    <div
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${clamped} out of 100` : `${clamped} out of 100`}
      className={cn('w-full overflow-hidden rounded-pill bg-sink', size === 'sm' ? 'h-1' : 'h-1.5')}
    >
      {/* The one legitimate inline style in the system: the width is data. */}
      <div className={cn('h-full rounded-pill transition-[width]', tone)} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function DimensionRow({
  dimensionKey,
  label,
  score,
  note,
}: {
  dimensionKey: string;
  label: string;
  score: number;
  note?: string;
}) {
  const Glyph = DIMENSION_ICON[dimensionKey] ?? IconInfo;
  return (
    <li>
      <div className="flex items-baseline justify-between gap-3 text-caption">
        <span className="flex items-center gap-1.5 font-medium text-ink">
          <Glyph className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
          {label}
        </span>
        <span className="tabular-nums text-ink-muted">{score}</span>
      </div>
      <div className="mt-1.5">
        <ScoreMeter score={score} label={label} size="sm" />
      </div>
      {note && <p className="mt-1.5 text-caption text-ink-muted">{note}</p>}
    </li>
  );
}

/**
 * A disqualifier.
 *
 * Visually a different category from a low score, not a redder version of one:
 * hazard icon, solid left rule, and its own heading. A blocker means the
 * application cannot succeed, which no dimension score on its own implies.
 */
export function BlockerList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-control border-l-2 border-danger bg-danger-tint px-4 py-3">
      <p className="flex items-center gap-1.5 text-caption font-semibold uppercase tracking-wide text-danger">
        <IconBlocker className="h-3.5 w-3.5 shrink-0" />
        Disqualifiers
      </p>
      <ul className="mt-1.5 list-disc space-y-1 pl-4 text-body-sm text-ink-body">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/* =============================================================== skeletons */

/**
 * Skeleton primitives for route-level loading states.
 *
 * Every page here queries Supabase in eu-central-1, so a navigation costs
 * several hundred milliseconds of round trip before anything can render. Next
 * shows a `loading.tsx` the instant a link is clicked, which turns that gap
 * from an unresponsive page into visible progress - the layout is already
 * correct and only the data is missing.
 */
export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-sink', className)} />;
}

export function SkeletonCard({ rows = 3, title = true }: { rows?: number; title?: boolean }) {
  return (
    <section className="card">
      {title && (
        <div className="card-header">
          <SkeletonLine className="h-3.5 w-40" />
        </div>
      )}
      <div className="card-body space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLine className="h-3 w-1/3" />
            <SkeletonLine className="h-3 w-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-2 px-5 py-4">
          <SkeletonLine className="h-6 w-12" />
          <SkeletonLine className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  );
}
