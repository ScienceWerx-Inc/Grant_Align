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
    <figure className="glass-strong w-full p-6 shadow-2xl shadow-black/40">
      <figcaption className="mb-5 flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
          A real evaluation
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-apply-dark/15 px-3 py-1 text-xs font-semibold text-apply-dark ring-1 ring-apply-dark/30">
          Apply <span className="tabular-nums opacity-80">{match.score}</span>
        </span>
      </figcaption>

      <p className="text-[15px] font-medium leading-snug text-white">
        {seeker.name}
        <span className="mx-2 text-white/35">→</span>
        {donor.name}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/55">{match.headline}</p>

      <ul className="mt-6 space-y-3">
        {dimensions.map(dimension => (
          <li key={dimension.key}>
            <div className="flex items-baseline justify-between gap-3 text-[11px]">
              <span className="font-medium text-white/75">
                {DIM_LABEL.get(dimension.key) ?? dimension.key}
              </span>
              <span className="tabular-nums text-white/45">{dimension.score}</span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-glow to-white/80"
                style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </figure>
  );
}
