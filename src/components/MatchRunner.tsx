'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { VerdictBadge } from '@/components/ui';
import type { MatchVerdict } from '@prisma/client';

interface Outcome {
  seekerName: string;
  donorName: string;
  score: number;
  verdict: MatchVerdict;
  skippedReason?: string;
}

interface RunState {
  total: number;
  done: number;
  results: Outcome[];
  finished: boolean;
  error?: string;
}

/**
 * Runs the matching engine and shows the run as it happens.
 *
 * The endpoint streams one event per scored pair, and everything shown here
 * comes from those events - no synthetic timer, no indeterminate spinner
 * pretending to know how far along it is. That matters because the run really
 * does take minutes: a fake progress bar that finishes early and then sits
 * there is worse than none, and a static "Scoring..." is indistinguishable
 * from a hang.
 *
 * Results are prepended as they arrive so the newest is always in view without
 * the list having to scroll.
 */
export function MatchRunner({
  seekerId,
  donorId,
  label = 'Re-run all matches',
}: {
  seekerId?: string;
  donorId?: string;
  label?: string;
}) {
  const router = useRouter();
  const [run, setRun] = useState<RunState | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    setBusy(true);
    setRun({ total: 0, done: 0, results: [], finished: false });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/matches/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ seekerId, donorId }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message.error ?? 'The matching run could not start.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // NDJSON: events are newline-delimited, and a chunk can split one in
      // half, so the trailing partial line is carried into the next read.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === 'start') {
            setRun(prev => ({ ...(prev ?? { done: 0, results: [], finished: false }), total: event.total }));
          } else if (event.type === 'pair') {
            setRun(prev =>
              prev
                ? { ...prev, done: event.index, total: event.total, results: [event.outcome, ...prev.results] }
                : prev,
            );
          } else if (event.type === 'done') {
            setRun(prev => (prev ? { ...prev, finished: true } : prev));
          } else if (event.type === 'error') {
            setRun(prev => (prev ? { ...prev, finished: true, error: event.error } : prev));
          }
        }
      }

      router.refresh();
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      setRun(prev =>
        prev
          ? {
              ...prev,
              finished: true,
              // A stopped run is not a failure: every pair already scored has
              // been saved, and re-running picks up where this left off.
              error: aborted ? undefined : err?.message ?? 'The matching run failed.',
            }
          : prev,
      );
      if (aborted) router.refresh();
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  const percent = run && run.total > 0 ? Math.round((run.done / run.total) * 100) : 0;

  return (
    <div className="no-print w-full">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={start} disabled={busy} className="btn-primary">
          {busy ? 'Scoring…' : label}
        </button>

        {busy && (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="btn-secondary"
          >
            Stop
          </button>
        )}

        {run && run.total > 0 && (
          <span className="text-xs tabular-nums text-muted">
            {run.done} of {run.total} pairs
            {run.finished ? ' · finished' : ''}
          </span>
        )}
      </div>

      {run && (
        <div className="mt-4 rounded-lg border border-line bg-white p-4">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-surface"
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Matching progress"
          >
            <div
              className={`h-full rounded-full bg-brand transition-[width] duration-500 ease-out ${
                busy ? 'animate-pulse' : ''
              }`}
              style={{ width: `${run.total > 0 ? percent : 4}%` }}
            />
          </div>

          <p className="mt-3 text-xs text-muted">
            {run.error ? (
              <span className="text-skip">{run.error}</span>
            ) : run.finished ? (
              `Scored ${run.done} pairing${run.done === 1 ? '' : 's'}. Everything below is saved.`
            ) : run.total === 0 ? (
              'Loading organizations…'
            ) : (
              `Evaluating each non-profit against each funder — scope, exclusions, geography and documentation.`
            )}
          </p>

          {run.results.length > 0 && (
            <ul className="mt-4 max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {run.results.map((outcome, i) => (
                <li
                  key={`${outcome.seekerName}-${outcome.donorName}-${i}`}
                  // Newest row animates in; the rest are already settled.
                  className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${
                    i === 0 ? 'animate-[fadeInUp_240ms_ease-out] bg-surface' : ''
                  }`}
                >
                  {outcome.skippedReason ? (
                    <span className="inline-flex w-[7.5rem] shrink-0 justify-center rounded-full bg-line/60 px-2.5 py-1 text-xs font-medium text-muted">
                      not scored
                    </span>
                  ) : (
                    <VerdictBadge verdict={outcome.verdict} score={outcome.score} />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {outcome.seekerName}
                    <span className="mx-1.5 text-muted">→</span>
                    {outcome.donorName}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
