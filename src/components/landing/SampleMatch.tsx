import { DIMENSIONS } from '@/ai/flows/scoreMatch';
import type { Match, Organization } from '@prisma/client';

interface Dimension {
  key: string;
  score: number;
  note: string;
}

const DIM_LABEL = new Map<string, string>(DIMENSIONS.map(d => [d.key, d.label]));

/**
 * A real evaluated match, shown as the product's own proof.
 *
 * Live data rather than an illustration: this is a system whose whole claim is
 * that its verdicts are specific and checkable, so a mock-up with invented
 * numbers would undercut the pitch it exists to make.
 *
 * Drawn in the reference's terms - hairline border, no fill, no shadow, and
 * scores expressed as rules rather than coloured bars. The one score that is
 * not full is the only place the eye needs to go.
 */
export function SampleMatch({
  match,
  seeker,
  donor,
}: {
  match: Match;
  seeker: Organization;
  donor: Organization;
}) {
  const dimensions = (match.dimensions as unknown as Dimension[]) ?? [];

  return (
    <figure className="rounded-panel border border-line p-8 bg-card shadow-overlay">
      <figcaption className="flex items-center justify-between gap-4">
        <span className="text-[11px] font-bold tracking-widest text-ink-muted uppercase">A real evaluation</span>
        <span className="inline-flex items-center gap-2 rounded-pill bg-brand-tint px-3 py-1 font-sans text-caption font-semibold text-brand-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Apply · {match.score}
        </span>
      </figcaption>

      <p className="mt-6 text-h4 font-semibold text-ink">
        {seeker.name}
        <span className="mx-2.5 text-ink-muted opacity-60">→</span>
        {donor.name}
      </p>
      <p className="mt-3 text-body-sm text-ink-body leading-relaxed">{match.headline}</p>

      <dl className="mt-8 space-y-4">
        {dimensions.map(dimension => (
          <div key={dimension.key}>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-ink-body font-medium">
                {DIM_LABEL.get(dimension.key) ?? dimension.key}
              </dt>
              <dd className="font-mono text-[13px] tabular-nums text-ink font-semibold">{dimension.score}</dd>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-brand-tint/60 overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </figure>
  );
}
