import { acceptResearch } from '@/lib/actions';
import { Card } from '@/components/ui';
import type { ResearchRun } from '@prisma/client';

interface Source {
  title: string;
  url: string;
}

const STATUS_STYLE: Record<string, string> = {
  RUNNING: 'text-maybe',
  SUCCESS: 'text-apply',
  FAILED: 'text-skip',
};

/**
 * The audit trail behind a donor's criteria (requirements §2.3, §4).
 *
 * Proposed fields sit here until someone accepts them. That gate exists because
 * a scraped exclusion that is wrong does its damage silently — it removes
 * eligible seekers from a funder's results and nobody ever sees the match that
 * did not happen.
 */
export function ResearchRuns({ runs }: { runs: ResearchRun[] }) {
  return (
    <Card title="Research history">
      {runs.length === 0 ? (
        <p className="field-empty">
          No research runs yet. A run fetches the funder&apos;s own pages and searches the
          aggregators, then proposes criteria for review.
        </p>
      ) : (
        <ul className="space-y-3">
          {runs.map(run => {
            const sources = (run.sources as unknown as Source[]) ?? [];
            const criteria = run.extracted as Record<string, unknown> | null;
            return (
              <li key={run.id} className="rounded-md border border-line px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-muted">
                    {run.startedAt.toLocaleString('en-US')} · {run.triggeredBy}
                  </span>
                  <span className={`text-xs font-semibold ${STATUS_STYLE[run.status]}`}>
                    {run.status.toLowerCase()}
                    {run.status === 'SUCCESS' && !run.grounded && ' (unverified)'}
                  </span>
                </div>

                {run.error && <p className="mt-1 text-xs text-skip">{run.error}</p>}

                {sources.length > 0 && (
                  <ul className="mt-2 space-y-0.5">
                    {sources.slice(0, 6).map(source => (
                      <li key={source.url} className="truncate text-xs">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-brand hover:underline"
                        >
                          {source.title || source.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {criteria && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted">
                      Proposed criteria
                    </summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-surface p-2 text-[11px] leading-relaxed">
                      {JSON.stringify(criteria, null, 2)}
                    </pre>
                    <form action={acceptResearch.bind(null, run.id)} className="no-print mt-2">
                      <button type="submit" className="btn-secondary">
                        Accept into donor profile
                      </button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
