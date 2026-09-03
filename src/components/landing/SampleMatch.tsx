import { DIMENSIONS } from '@/ai/flows/scoreMatch';
import type { Match, Organization } from '@prisma/client';

interface Dimension {
  key: string;
  score: number;
  note: string;
}

const DIM_LABEL = new Map<string, string>(DIMENSIONS.map(d => [d.key, d.label]));

/**
 * A real evaluated match, shown on the landing page as the product's own proof.
 *
 * Deliberately live data rather than an illustration: this is a system whose
 * whole claim is that its verdicts are specific and checkable, so a mocked-up
 * example with invented numbers would undercut the pitch it is meant to make.
 * If no match exists yet the caller renders nothing at all.
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
  // All six, not the top few. The strongest match tends to score 100 on its
  // first four dimensions, and four full bars in a row read as placeholder
  // artwork; the lower-scoring dimensions are what show a real evaluation.
  const dimensions = (match.dimensions as unknown as Dimension[]) ?? [];

  return (
    <figure className="w-full rounded-xl border border-line bg-white p-5 shadow-sm">
      <figcaption className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          A real evaluation
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-apply/10 px-2.5 py-1 text-xs font-semibold text-apply ring-1 ring-apply/20">
          Apply <span className="tabular-nums opacity-70">{match.score}</span>
        </span>
      </figcaption>

      <p className="text-sm font-medium leading-snug">
        {seeker.name}
        <span className="mx-1.5 text-muted">→</span>
        {donor.name}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{match.headline}</p>

      <ul className="mt-5 space-y-2">
        {dimensions.map(dimension => (
          <li key={dimension.key}>
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-medium">{DIM_LABEL.get(dimension.key) ?? dimension.key}</span>
              <span className="tabular-nums text-muted">{dimension.score}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
