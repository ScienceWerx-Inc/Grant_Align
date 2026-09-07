'use client';

import { useEffect } from 'react';
import { Overline } from '@/components/ui';

/**
 * The route error boundary.
 *
 * Previously an uncaught render error showed Next's unstyled default page. It
 * now looks like the rest of the product, and offers the retry that Next
 * already provides - `reset()` re-renders the segment, which is genuinely
 * enough for the transient case this app hits most: a Supabase query that
 * timed out against a one-connection pool.
 *
 * The message itself is deliberately not shown. It can carry query text and
 * table names, and this boundary catches server errors as well as client ones.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The digest is the only safe handle on the real error: it correlates this
    // page with the full stack in the server log without printing it here.
    console.error('Route error', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-band px-6">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-8 text-center shadow-raised">
        <Overline>Error</Overline>
        <h1 className="mt-3 text-h2 font-medium tracking-tight text-ink">Something went wrong</h1>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          The page could not be loaded. Trying again often works, since this is usually a timed-out
          request rather than a broken page.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <a href="/" className="btn-secondary">
            Back to home
          </a>
        </div>
        {error.digest && (
          <p className="mt-6 border-t border-line pt-4 font-mono text-caption text-ink-faint">
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
