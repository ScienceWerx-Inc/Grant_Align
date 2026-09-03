import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { WorkflowDiagram } from '@/components/landing/Diagram';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { SampleMatch } from '@/components/landing/SampleMatch';

export const dynamic = 'force-dynamic';

/**
 * Public landing page.
 *
 * The counts are read live rather than hard-coded. A grant-matching product
 * claiming "12 local funders" is making a checkable claim, and a stale number
 * on the front page is the kind of thing a subject-matter reviewer notices
 * first. If the database is unreachable the section simply omits the figures
 * rather than showing zeros, which would read as an empty product.
 */
async function landingData() {
  try {
    const [donors, researched, seekers, matches, sample] = await Promise.all([
      prisma.organization.count({ where: { kind: 'DONOR' } }),
      prisma.donorProfile.count({ where: { lastResearchedAt: { not: null } } }),
      prisma.organization.count({ where: { kind: 'SEEKER' } }),
      prisma.match.count(),
      prisma.match.findFirst({
        where: { verdict: 'APPLY' },
        orderBy: { score: 'desc' },
        include: { seeker: true, donor: true },
      }),
    ]);
    return { donors, researched, seekers, matches, sample };
  } catch {
    return null;
  }
}

const SEEKER_STEPS = [
  {
    title: 'Tell us what you actually do',
    body: 'An AI interviewer asks past the mission statement: who you really serve, what you really do, and just as importantly what you do not do and who you do not serve.',
  },
  {
    title: 'Track your paperwork',
    body: 'Form 990, certificate of good standing, IRS determination letter. The engine treats missing mandatory documents as disqualifying, and tells you which grant it cost you.',
  },
  {
    title: 'Get a verdict, not a list',
    body: 'Every funder comes back as apply, worth a look, or skip, with the specific facts behind it and what would change the answer.',
  },
];

const DONOR_STEPS = [
  {
    title: 'Your criteria, kept current',
    body: 'A scheduled research pass reads your published guidelines, your IRS filings and the grant databases, and proposes updates for a person to approve.',
  },
  {
    title: 'Say what guidelines cannot',
    body: 'A dedicated interviewer captures the nuance: what actually persuades you, and the most common reason you decline a request.',
  },
  {
    title: 'See who fits',
    body: 'Well-matched local organizations surface with evidence, including the ones whose work you would never have found by keyword.',
  },
];

const FEATURES = [
  ['Negative scope', 'What an organization does NOT do, and who a funder will NOT fund. Exclusions are what let the engine say "skip this one" with confidence, and nobody volunteers them unasked.'],
  ['Research with sources', 'Every proposed criterion carries the page it came from. Nothing reaches a live profile without a person accepting it.'],
  ['Blockers over scores', 'A stated exclusion, an out-of-area address or missing mandatory paperwork forces a skip regardless of thematic fit. A false "apply" costs a small non-profit more than a false "skip".'],
  ['One-page summary', 'A standardized funder-ready 1-pager, built only from what you have actually told us, printed straight onto your own letterhead.'],
];

/**
 * The data-dependent half of the hero, streamed separately.
 *
 * The five queries behind it are round trips to eu-central-1, and holding the
 * headline and call-to-action hostage to them made the whole page appear
 * blank for over a second. Suspense lets the static half paint straight away
 * and the numbers arrive when they arrive.
 */
async function HeroData() {
  const stats = await landingData();
  if (!stats) return null;

  return (
    <>
      <dl className="mt-12 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
        {[
          [stats.donors, 'regional funders'],
          [stats.researched, 'researched live'],
          [stats.seekers, 'non-profit profiles'],
          [stats.matches, 'pairings evaluated'],
        ].map(([value, label]) => (
          <div key={label as string}>
            <dt className="text-2xl font-semibold tracking-tight">{value as number}</dt>
            <dd className="mt-0.5 text-xs text-muted">{label as string}</dd>
          </div>
        ))}
      </dl>

      {stats.sample && (
        <div className="mt-12 lg:absolute lg:right-6 lg:top-1/2 lg:mt-0 lg:w-[26rem] lg:-translate-y-1/2 lg:pl-4">
          <SampleMatch match={stats.sample} seeker={stats.sample.seeker} donor={stats.sample.donor} />
        </div>
      )}
    </>
  );
}

/** Keeps the hero's height stable while the numbers load. */
function HeroDataSkeleton() {
  return (
    <dl className="mt-12 grid max-w-xl grid-cols-2 gap-6 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-7 w-12 animate-pulse rounded bg-line/70" />
          <div className="h-2.5 w-20 animate-pulse rounded bg-line/70" />
        </div>
      ))}
    </dl>
  );
}

export default async function LandingPage() {
  // Signed-in visitors get their own workspace rather than /dashboard, which
  // only staff can load.
  const user = await getSessionUser();
  const appHref = user ? homePathFor(user) : '/login';

  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3.5">
          <span className="text-sm font-semibold tracking-tight">
            Grant<span className="text-brand">Align</span>
          </span>
          <nav className="ml-auto flex items-center gap-1">
            <a href="#how" className="hidden rounded-md px-3 py-1.5 text-sm text-muted transition hover:text-ink sm:block">How it works</a>
            <a href="#engine" className="hidden rounded-md px-3 py-1.5 text-sm text-muted transition hover:text-ink sm:block">The engine</a>
            <Link href={appHref} className="btn-primary ml-2">
              {user ? 'Open the app' : 'Sign in'}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line bg-gradient-to-b from-brand-light/50 to-white">
        <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="lg:max-w-[38rem]">
          <p className="mb-4 inline-flex items-center rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand-dark">
            Frederick County, Maryland
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Know which grants to apply for, and which to skip.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Grant Align matches local non-profits to regional funders on operational reality — what an
            organization actually does, and explicitly does not do — instead of the mission-statement
            language that makes every applicant look the same.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? appHref : '/signup?role=seeker'} className="btn-primary px-5 py-2.5">
              I run a non-profit
            </Link>
            <Link href={user ? appHref : '/signup?role=donor'} className="btn-secondary px-5 py-2.5">
              I fund non-profits
            </Link>
          </div>

            <Suspense fallback={<HeroDataSkeleton />}>
              <HeroData />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="grid gap-10 lg:grid-cols-[1fr,1.2fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                The scarcest thing a small non-profit has is grant-writing hours.
              </h2>
            </div>
            <div className="space-y-4 text-[15px] leading-relaxed text-muted">
              <p>
                Two organizations write nearly identical mission statements and do completely
                different work. A funder publishes guidelines that say what it supports but rarely
                what it quietly never funds. So applications get written on hope, and most of them
                were never eligible.
              </p>
              <p className="text-ink">
                The information that decides a grant is the information nobody writes down: the
                boundaries. Who you turn away. What you refer elsewhere. What a funder has declined
                three years running. Grant Align is built to ask for exactly that, from both sides,
                and to compare the answers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            One platform, two sides. Both feed the same evaluation.
          </p>

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {[
              ['For grant seekers', SEEKER_STEPS],
              ['For grant givers', DONOR_STEPS],
            ].map(([heading, steps]) => (
              <div key={heading as string} className="card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
                  {heading as string}
                </h3>
                <ol className="mt-5 space-y-5">
                  {(steps as typeof SEEKER_STEPS).map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{step.title}</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engine */}
      <section id="engine" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">Inside the matching engine</h2>
          <p className="mt-2 max-w-2xl text-[15px] text-muted">
            Six weighted dimensions rather than one opaque number, so a seeker can see which one sank
            a match and whether it is fixable.
          </p>

          <div className="mt-10 rounded-xl border border-line bg-white p-6">
            <WorkflowDiagram />
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(([title, body]) => (
              <div key={title} className="rounded-lg border border-line p-5">
                <h3 className="text-sm font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-dark">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              See it against real Frederick County funders.
            </h2>
            <p className="mt-1.5 text-sm text-white/70">
              Live criteria, real filings, and verdicts you can argue with.
            </p>
          </div>
          <Link
            href={appHref}
            className="btn rounded-md bg-white px-5 py-2.5 font-medium text-brand-dark hover:bg-white/90"
          >
            {user ? 'Open the app' : 'Get started'}
          </Link>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-8 text-xs text-muted">
          <span className="font-medium text-ink">GrantAlign</span>
          <span>Prototype — Frederick County, MD</span>
          <Link href={appHref} className="ml-auto hover:text-ink">
            {user ? 'Your workspace' : 'Sign in'}
          </Link>
          {!user && <Link href="/signup" className="hover:text-ink">Create an account</Link>}
        </div>
      </footer>
    </div>
  );
}
