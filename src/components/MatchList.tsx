import Link from 'next/link';
import { BlockerList, DimensionRow, VerdictBadge } from '@/components/ui';
import { IconChevronDown } from '@/components/icons';
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
 *
 * The dimensions are rendered in the engine's own order rather than whatever
 * order the model returned them in, so the same six always read down the page
 * in the same sequence and can be compared between two matches at a glance.
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
  const returned = (match.dimensions as unknown as Dimension[]) ?? [];
  const byKey = new Map(returned.map(d => [d.key, d]));
  const dimensions = DIMENSIONS.map(d => byKey.get(d.key)).filter(Boolean) as Dimension[];

  return (
    <details className="group card overflow-hidden">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-band">
        <VerdictBadge verdict={match.verdict} score={match.score} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-ink">{counterparty.name}</p>
          <p className="truncate text-caption text-ink-muted">{match.headline}</p>
        </div>
        <span className="flex items-center gap-1 text-caption text-ink-muted">
          <span className="group-open:hidden">Details</span>
          <IconChevronDown className="h-4 w-4 transition group-open:rotate-180" />
        </span>
      </summary>

      <div className="space-y-5 border-t border-line px-4 py-4">
        <p className="measure text-body-sm text-ink-body">{match.rationale}</p>

        <BlockerList items={match.blockers} />

        <div className="grid gap-4 sm:grid-cols-2">
          {match.alignments.length > 0 && (
            <div>
              <p className="label">What lines up</p>
              <ul className="list-disc space-y-1 pl-4 text-body-sm text-ink-body">
                {match.alignments.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {match.gaps.length > 0 && (
            <div>
              <p className="label">Where it is weak</p>
              <ul className="list-disc space-y-1 pl-4 text-body-sm text-ink-body">
                {match.gaps.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <p className="label">Scoring breakdown</p>
          <ul className="space-y-3">
            {dimensions.map(dimension => (
              <DimensionRow
                key={dimension.key}
                dimensionKey={dimension.key}
                label={DIM_LABEL.get(dimension.key) ?? dimension.key}
                score={dimension.score}
                note={dimension.note}
              />
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-caption text-ink-muted">
          <Link href={href} className="btn-link">
            Open {counterparty.name} →
          </Link>
          <span>Scored {match.computedAt.toLocaleDateString('en-US')}</span>
        </div>
      </div>
    </details>
  );
}
