import Link from 'next/link';
import type { MatchVerdict } from '@prisma/client';

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
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="no-print flex gap-2">{action}</div>}
    </div>
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
    <section className={`card ${className}`}>
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

const VERDICT_STYLE: Record<MatchVerdict, string> = {
  APPLY: 'bg-apply/10 text-apply ring-apply/20',
  MAYBE: 'bg-maybe/10 text-maybe ring-maybe/20',
  SKIP: 'bg-skip/10 text-skip ring-skip/20',
};

const VERDICT_LABEL: Record<MatchVerdict, string> = {
  APPLY: 'Apply',
  MAYBE: 'Worth a look',
  SKIP: 'Skip',
};

export function VerdictBadge({ verdict, score }: { verdict: MatchVerdict; score?: number }) {
  return (
    <span
      // Fixed width and no wrapping: "Worth a look" is twice the length of
      // "Apply", and letting badges size to their content left every row in a
      // list starting its text at a different x position.
      className={`inline-flex w-[7.5rem] shrink-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${VERDICT_STYLE[verdict]}`}
    >
      <span>{VERDICT_LABEL[verdict]}</span>
      {score !== undefined && <span className="tabular-nums opacity-70">{score}</span>}
    </span>
  );
}

/** Renders a value, or an explicit "not captured yet" rather than blank space. */
export function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={value ? 'whitespace-pre-wrap text-sm' : 'field-empty'}>
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

export function EmptyState({ title, hint, cta }: { title: string; hint?: string; cta?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-md text-sm text-muted">{hint}</p>}
      {cta && <div className="mt-4 flex justify-center">{cta}</div>}
    </div>
  );
}

export function StatTile({ label, value, href }: { label: string; value: string | number; href?: string }) {
  const body = (
    <div className="card px-5 py-4 transition hover:border-brand/40">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

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
  return <div className={`animate-pulse rounded bg-line/70 ${className}`} />;
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
