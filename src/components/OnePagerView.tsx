'use client';

import { useState } from 'react';

interface OnePager {
  organizationName: string;
  tagline: string;
  overview: string;
  whoWeServe: string;
  whatWeDo: string;
  scope: string;
  impact: string[];
  quickFacts: { label: string; value: string }[];
  fundingNeeds: string;
  contactBlock: string;
  omissions: string[];
}

/**
 * The generated 1-pager (requirements §2.2).
 *
 * The sheet is deliberately unbranded — no logo, no app chrome, generous top
 * margin — because it is meant to be printed onto the organization's own
 * letterhead. `.no-print` strips everything of ours at print time, and the
 * copy button emits plain text for pasting into Word or Google Docs.
 */
export function OnePagerView({ orgId }: { orgId: string }) {
  const [data, setData] = useState<OnePager | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/one-pager', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orgId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Generation failed.');
      setData(body);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function asPlainText(sheet: OnePager): string {
    return [
      sheet.organizationName,
      sheet.tagline,
      '',
      sheet.overview,
      '',
      'WHO WE SERVE',
      sheet.whoWeServe,
      '',
      'WHAT WE DO',
      sheet.whatWeDo,
      '',
      'SCOPE OF OUR WORK',
      sheet.scope,
      '',
      'IMPACT',
      ...sheet.impact.map(item => `• ${item}`),
      '',
      'AT A GLANCE',
      ...sheet.quickFacts.map(fact => `${fact.label}: ${fact.value}`),
      '',
      'GRANT SUPPORT WOULD FUND',
      sheet.fundingNeeds,
      '',
      'CONTACT',
      sheet.contactBlock,
    ].join('\n');
  }

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(asPlainText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!data) {
    return (
      <div className="rounded-card border border-dashed border-line bg-card px-6 py-12 text-center">
        <p className="text-body-sm font-medium">Generate the 1-pager</p>
        <p className="mx-auto mt-1 max-w-md text-body-sm text-ink-muted">
          Compiles the profile into the standard one-page summary funders expect. Nothing is
          invented — fields the profile cannot support are listed for you to fill in by hand.
        </p>
        <button type="button" onClick={generate} disabled={busy} className="btn-primary mt-4">
          {busy ? 'Compiling…' : 'Generate'}
        </button>
        {error && <p className="mt-3 text-caption text-verdict-skip">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center gap-2">
        <button type="button" onClick={generate} disabled={busy} className="btn-secondary">
          {busy ? 'Regenerating…' : 'Regenerate'}
        </button>
        <button type="button" onClick={copy} className="btn-secondary">
          {copied ? 'Copied' : 'Copy as text'}
        </button>
        <button type="button" onClick={() => window.print()} className="btn-primary">
          Print / save as PDF
        </button>
        <span className="text-caption text-ink-muted">
          Printing drops everything but the sheet, so it lands cleanly on your letterhead.
        </span>
      </div>

      {error && <p className="no-print text-caption text-verdict-skip">{error}</p>}

      {data.omissions.length > 0 && (
        <div className="no-print rounded-control bg-verdict-maybe/10 px-4 py-3">
          <p className="text-caption font-semibold text-verdict-maybe">Fill these in by hand</p>
          <ul className="mt-1 list-disc pl-4 text-caption text-ink">
            {data.omissions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 8.5in: US Letter. This sheet is printed, so the measure is
          the paper, not a breakpoint. */}
      <article className="print-sheet mx-auto max-w-[8.5in] rounded-card border border-line bg-card px-12 pb-12 pt-16 text-caption leading-relaxed">
        {/* Top space left clear for the organization's own letterhead. */}
        <header className="border-b border-line pb-4">
          <h1 className="text-h3 font-semibold tracking-tight">{data.organizationName}</h1>
          <p className="mt-1 text-body-sm text-ink-muted">{data.tagline}</p>
        </header>

        <p className="mt-5">{data.overview}</p>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <section>
            <h2 className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-ink">
              Who we serve
            </h2>
            <p>{data.whoWeServe}</p>
          </section>
          <section>
            <h2 className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-ink">
              What we do
            </h2>
            <p>{data.whatWeDo}</p>
          </section>
        </div>

        <section className="mt-5">
          <h2 className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-ink">
            Scope of our work
          </h2>
          <p>{data.scope}</p>
        </section>

        {data.impact.length > 0 && (
          <section className="mt-5">
            <h2 className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-ink">Impact</h2>
            <ul className="list-disc space-y-0.5 pl-5">
              {data.impact.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {data.quickFacts.length > 0 && (
          <section className="mt-5 rounded-control bg-band px-4 py-3">
            <h2 className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-brand-ink">
              At a glance
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
              {data.quickFacts.map(fact => (
                <div key={fact.label}>
                  <dt className="text-caption uppercase tracking-wide text-ink-muted">{fact.label}</dt>
                  <dd className="font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-5">
          <h2 className="mb-1 text-caption font-semibold uppercase tracking-wide text-brand-ink">
            Grant support would fund
          </h2>
          <p>{data.fundingNeeds}</p>
        </section>

        <footer className="mt-6 whitespace-pre-line border-t border-line pt-4 text-caption text-ink-muted">
          {data.contactBlock}
        </footer>
      </article>
    </div>
  );
}
