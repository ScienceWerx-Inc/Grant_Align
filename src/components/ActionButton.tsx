'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Posts to a long-running endpoint (research, matching, refresh) and reports the
 * outcome inline. These calls take tens of seconds, so the button owns its own
 * pending and error state rather than relying on a form transition.
 */
/** Substitutes `{field}` placeholders in a template from the response body. */
function fill(template: string, data: Record<string, any>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(data[key] ?? ''));
}

export function ActionButton({
  endpoint,
  body,
  label,
  pendingLabel,
  variant = 'primary',
  successMessage = 'Done.',
}: {
  endpoint: string;
  body: Record<string, unknown>;
  label: string;
  pendingLabel: string;
  variant?: 'primary' | 'secondary';
  /**
   * Template for the inline confirmation. `{field}` placeholders are filled
   * from the JSON response. A string rather than a formatter function because
   * this is rendered from server components, which cannot pass functions
   * across the boundary.
   */
  successMessage?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'That did not work.');
      // Some endpoints answer 200 with `ok: false` — the work ran, found
      // nothing, and recorded why. That is a failure to report, not a success.
      if (data.ok === false) throw new Error(data.error ?? 'Nothing usable was found.');
      setMessage({ tone: 'ok', text: fill(successMessage, data) });
      router.refresh();
    } catch (err: any) {
      setMessage({ tone: 'bad', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={variant === 'primary' ? 'btn-primary' : 'btn-secondary'}
      >
        {busy ? pendingLabel : label}
      </button>
      {message && (
        <span className={`text-xs ${message.tone === 'ok' ? 'text-apply' : 'text-skip'}`}>
          {message.text}
        </span>
      )}
    </div>
  );
}
