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
    <figure className="hairline rounded-lg p-8">
      <figcaption className="flex items-center justify-between gap-4">
        <span className="meta">A real evaluation</span>
        <span className="status-pill">
          <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
          Apply · {match.score}
        </span>
      </figcaption>

      <p className="mt-6 text-heading-xs text-chalk">
        {seeker.name}
        <span className="mx-2.5 text-iron">→</span>
        {donor.name}
      </p>
      <p className="mt-3 text-body text-smoke">{match.headline}</p>

      <dl className="mt-8 space-y-3.5">
        {dimensions.map(dimension => (
          <div key={dimension.key}>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[13px] text-ash">
                {DIM_LABEL.get(dimension.key) ?? dimension.key}
              </dt>
              <dd className="font-mono text-[13px] tabular-nums text-smoke">{dimension.score}</dd>
            </div>
            <div className="mt-2 h-px w-full bg-graphite">
              <div
                className="h-px bg-chalk"
                style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
              />
            </div>
          </div>
        ))}
      </dl>
    </figure>
  );
}
