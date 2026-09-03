import Link from 'next/link';
import { VerdictBadge } from '@/components/ui';
import { DIMENSIONS } from '@/ai/flows/scoreMatch';
import type { Match, Organization } from '@prisma/client';

interface Dimension {
  key: string;
  score: number;
  note: string;
}

const DIM_LABEL = new Map<string, string>(DIMENSIONS.map(d => [d.key, d.label]));

/**
 * A match, expanded. The per-dimension bars are the reason the engine is
 * arguable rather than oracular: a seeker can see that they lost on geography
 * and not on merit, and act on that.
 */
export function MatchCard({
  match,
  counterparty,
  href,
}: {
  match: Match;
  counterparty: Organization;
  href: string;
}) {
  const dimensions = (match.dimensions as unknown as Dimension[]) ?? [];

  return (
    <details className="group rounded-lg border border-line bg-white">
      <summary className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
        <VerdictBadge verdict={match.verdict} score={match.score} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{counterparty.name}</p>
          <p className="truncate text-xs text-muted">{match.headline}</p>
        </div>
        <span className="text-xs text-muted group-open:hidden">Details</span>
      </summary>

      <div className="space-y-4 border-t border-line px-4 py-4">
        <p className="text-sm">{match.rationale}</p>

        {match.blockers.length > 0 && (
          <div className="rounded-md bg-skip/5 px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-skip">Disqualifiers</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
              {match.blockers.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {match.alignments.length > 0 && (
            <div>
              <p className="label">What lines up</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm">
                {match.alignments.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {match.gaps.length > 0 && (
            <div>
              <p className="label">Where it is weak</p>
              <ul className="list-disc space-y-0.5 pl-4 text-sm">
                {match.gaps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="label">Scoring breakdown</p>
          <ul className="space-y-2">
            {dimensions.map(dimension => (
              <li key={dimension.key}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium">{DIM_LABEL.get(dimension.key) ?? dimension.key}</span>
                  <span className="text-muted">{dimension.score}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(0, Math.min(100, dimension.score))}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">{dimension.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center justify-between text-xs text-muted">
          <Link href={href} className="hover:text-brand">
            Open {counterparty.name} →
          </Link>
          <span>Scored {match.computedAt.toLocaleDateString('en-US')}</span>
        </div>
      </div>
    </details>
  );
}
