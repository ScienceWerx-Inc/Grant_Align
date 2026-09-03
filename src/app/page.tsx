import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { WorkflowDiagram } from '@/components/landing/Diagram';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { SampleMatch } from '@/components/landing/SampleMatch';
import { Starfield } from '@/components/landing/Orb';
import { MatchArtwork } from '@/components/landing/Artwork';
import { FloatingStat } from '@/components/landing/FloatingStat';

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
/**
 * The cards that float over the hero visual.
 *
 * Live data, positioned to overlap the orb. Everything here is real: the match
 * is the strongest one currently in the database, and the funder count is a
 * count. A hero whose entire claim is "checkable verdicts" cannot be decorated
 * with invented figures.
 */
async function HeroCards() {
  const stats = await landingData();
  if (!stats) return null;

  const researchedPercent =
    stats.donors > 0 ? Math.round((stats.researched / stats.donors) * 100) : 0;

  return (
    <>
      <FloatingStat
        label="Regional funders"
        value={`${stats.researched} of ${stats.donors} researched from live sources`}
        meter={researchedPercent}
        href="#engine"
        className="left-0 top-[3rem] hidden lg:block"
      />

      {stats.sample && (
        <FloatingStat
          label="Strongest match"
          value={`${stats.sample.score} · ${stats.sample.seeker.name}`}
          meter={stats.sample.score}
          href="#how"
          className="right-0 top-[8rem] hidden lg:block"
        />
      )}

      <FloatingStat
        label="Pairings evaluated"
        value={`${stats.matches} across ${stats.seekers} non-profit profiles`}
        href="#how"
        className="left-0 top-[13rem] hidden xl:block"
      />
    </>
  );
}

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-night-950 text-white antialiased">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-6">
          <span className="text-[17px] font-semibold tracking-tight">
            Grant<span className="text-glow">Align</span>
          </span>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 md:flex">
            <a href="#problem" className="text-sm text-white/70 transition hover:text-white">Why</a>
            <a href="#how" className="text-sm text-white/70 transition hover:text-white">How it works</a>
            <a href="#engine" className="text-sm text-white/70 transition hover:text-white">The engine</a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/login" className="pill px-5 py-2.5 text-white/80 hover:bg-white/[0.06] hover:text-white">
              Login
            </Link>
            <Link href="/login" className="pill-light px-6 py-2.5">Sign in</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-14rem] top-[-16rem] h-[42rem] w-[46rem] rounded-full bg-[radial-gradient(closest-side,rgba(122,104,190,0.28),transparent)] blur-3xl" />
          <div className="absolute right-[-10rem] top-[-10rem] h-[34rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgba(77,159,214,0.18),transparent)] blur-3xl" />
          <Starfield />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-8 pt-32 text-center sm:pt-36">
          <h1 className="mx-auto max-w-4xl text-display font-semibold">
            Know Which Grants
            <br />
            To Apply For
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-[15px] leading-relaxed text-white/55">
            Matching local non-profits to regional funders on what an organization actually does,
            and explicitly does not do.. powered by Grant Align
          </p>

          <div className="mt-9 flex justify-center">
            <Link href="/login" className="pill-light px-8 py-3.5 text-[15px]">
              Sign In &amp; Match
            </Link>
          </div>
        </div>

        {/* The artwork, with the cards overlapping it. */}
        <div className="relative -mt-2">
          <div className="mx-auto max-w-[48rem] px-6">
            <MatchArtwork />
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-full max-w-6xl px-6">
            <div className="pointer-events-auto">
              <Suspense fallback={null}>
                <HeroCards />
              </Suspense>
            </div>
          </div>
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-night-950" />
      </section>

      {/* Problem */}
      <section id="problem" className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 lg:grid-cols-[0.9fr,1.1fr]">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight">
              The scarcest thing a small non-profit has is grant-writing hours.
            </h2>
            <div className="space-y-5 text-[15px] leading-relaxed text-white/55">
              <p>
                Two organizations write nearly identical mission statements and do completely
                different work. A funder publishes guidelines that say what it supports but rarely
                what it quietly never funds. So applications get written on hope, and most of them
                were never eligible.
              </p>
              <p className="text-white/80">
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
      <section id="how" className="border-t border-white/[0.07] bg-night-900/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 max-w-xl text-[15px] text-white/55">
            One platform, two sides. Both feed the same evaluation.
          </p>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {[
              ['For grant seekers', SEEKER_STEPS],
              ['For grant givers', DONOR_STEPS],
            ].map(([heading, steps]) => (
              <div key={heading as string} className="glass p-8">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-glow">
                  {heading as string}
                </h3>
                <ol className="mt-7 space-y-6">
                  {(steps as typeof SEEKER_STEPS).map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-xs font-semibold text-white/80">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-[15px] font-medium">{step.title}</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-white/55">{step.body}</p>
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
      <section id="engine" className="border-t border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <h2 className="text-3xl font-semibold tracking-tight">Inside the matching engine</h2>
          <p className="mt-3 max-w-xl text-[15px] text-white/55">
            Six weighted dimensions rather than one opaque number, so a seeker can see which one
            sank a match and whether it is fixable.
          </p>

          <div className="glass mt-12 p-8">
            <WorkflowDiagram />
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {FEATURES.map(([title, body]) => (
              <div key={title} className="glass p-7">
                <h3 className="text-[15px] font-medium">{title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden border-t border-white/[0.07]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[26rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(77,159,214,0.22),transparent)] blur-2xl"
        />
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              See it against real Frederick County funders.
            </h2>
            <p className="mt-2 text-sm text-white/55">
              Live criteria, real IRS filings, and verdicts you can argue with.
            </p>
          </div>
          <Link href="/login" className="pill-light shrink-0">Sign in</Link>
        </div>
      </section>

      <footer className="border-t border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-10 text-xs text-white/40">
          <span className="font-medium text-white/70">GrantAlign</span>
          <span>Prototype — Frederick County, MD</span>
          <Link href="/login" className="ml-auto transition hover:text-white">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
