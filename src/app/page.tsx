import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { WorkflowDiagram } from '@/components/landing/Diagram';
import { SampleMatch } from '@/components/landing/SampleMatch';
import { MatchArtwork } from '@/components/landing/Artwork';

export const dynamic = 'force-dynamic';

/**
 * Public landing page, built to the Hyperstudio reference (reference_ui.md).
 *
 * The system's discipline: a near-black canvas, hairline rules doing every bit
 * of structural work, weight 400 at every size, and no fills beyond the single
 * white pill. Sections are divided by 1px lines rather than background shifts,
 * which is what keeps it feeling architectural rather than like a stack of
 * coloured bands.
 *
 * Counts are read live. A grant-matching product claiming "11 regional funders"
 * is making a checkable claim, and a stale number on the front page is the kind
 * of thing a subject-matter reviewer notices first.
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
    // A landing page that 500s because the database is asleep is worse than one
    // that omits its numbers.
    return null;
  }
}

const SEEKER_STEPS = [
  ['Tell us what you actually do', 'An AI interviewer asks past the mission statement: who you really serve, what you really do, and just as importantly what you do not do and who you do not serve.'],
  ['Track your paperwork', 'Form 990, certificate of good standing, IRS determination letter. Missing mandatory documents are treated as disqualifying, and you are told which grant it cost you.'],
  ['Get a verdict, not a list', 'Every funder returns as apply, worth a look, or skip, with the specific facts behind it and what would change the answer.'],
];

const DONOR_STEPS = [
  ['Your criteria, kept current', 'A scheduled pass reads your published guidelines, your IRS filings and the grant databases, and proposes updates for a person to approve.'],
  ['Say what guidelines cannot', 'A dedicated interviewer captures the nuance: what actually persuades you, and the most common reason you decline a request.'],
  ['See who fits', 'Well-matched local organizations surface with evidence, including the ones whose work you would never have found by keyword.'],
];

const PRINCIPLES = [
  ['Negative scope', 'What an organization does NOT do, and who a funder will NOT fund. Exclusions are what let the engine say "skip this one" with confidence, and nobody volunteers them unasked.'],
  ['Research with sources', 'Every proposed criterion carries the page it came from. Nothing reaches a live profile without a person accepting it.'],
  ['Blockers over scores', 'A stated exclusion, an out-of-area address or missing mandatory paperwork forces a skip regardless of thematic fit. A false "apply" costs a small non-profit more than a false "skip".'],
  ['One-page summary', 'A standardized funder-ready 1-pager, built only from what you have actually told us, printed straight onto your own letterhead.'],
];

async function LiveStats() {
  const stats = await landingData();
  if (!stats) return null;

  return (
    <dl className="grid grid-cols-2 divide-graphite border-graphite sm:grid-cols-4 sm:divide-x sm:border-x">
      {[
        [stats.donors, 'Regional funders'],
        [stats.researched, 'Researched live'],
        [stats.seekers, 'Non-profit profiles'],
        [stats.matches, 'Pairings evaluated'],
      ].map(([value, label]) => (
        <div key={label as string} className="px-6 py-8 text-center">
          <dt className="text-heading font-normal text-chalk">{value as number}</dt>
          <dd className="meta mt-2">{label as string}</dd>
        </div>
      ))}
    </dl>
  );
}

function LiveStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 divide-graphite border-graphite sm:grid-cols-4 sm:divide-x sm:border-x">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-3 px-6 py-8">
          <div className="mx-auto h-8 w-12 animate-pulse rounded bg-graphite" />
          <div className="mx-auto h-3 w-24 animate-pulse rounded bg-graphite" />
        </div>
      ))}
    </div>
  );
}

async function ProofOfWork() {
  const stats = await landingData();
  if (!stats?.sample) return null;
  return <SampleMatch match={stats.sample} seeker={stats.sample.seeker} donor={stats.sample.donor} />;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian font-sans text-chalk antialiased">
      {/* Navigation */}
      <header className="border-b border-graphite">
        <div className="mx-auto flex max-w-page items-center px-6 py-5">
          <Link href="/" className="text-heading-xs text-chalk">
            Grant<span className="text-smoke">Align</span>
          </Link>

          <nav className="ml-12 hidden items-center gap-6 md:flex">
            {[
              ['#why', 'Why'],
              ['#how', 'How it works'],
              ['#engine', 'The engine'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-[14px] uppercase tracking-[0.04em] text-smoke transition hover:text-chalk">
                {label}
              </a>
            ))}
          </nav>

          <Link href="/login" className="pill-white ml-auto px-6 py-2.5">
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-graphite bg-carbon">
        <div className="mx-auto max-w-page px-6 pb-16 pt-28 text-center sm:pt-32">
          <span className="status-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-green" />
            Frederick County, Maryland
          </span>

          <h1 className="mx-auto mt-10 max-w-4xl text-balance text-display font-normal text-chalk">
            Know which grants to apply for.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-subheading font-normal leading-relaxed text-smoke">
            Matching local non-profits to regional funders on what an organization actually does —
            and explicitly does not do — rather than on mission-statement language.
          </p>

          <div className="mt-12 flex justify-center">
            <Link href="/login" className="pill-white">Start now ↗</Link>
          </div>
        </div>

        {/* The dot field spans the full viewport, as the reference intends. */}
        <div className="pb-20">
          <MatchArtwork />
        </div>
      </section>

      {/* Live numbers */}
      <section className="border-b border-graphite">
        <div className="mx-auto max-w-page px-6">
          <Suspense fallback={<LiveStatsSkeleton />}>
            <LiveStats />
          </Suspense>
        </div>
      </section>

      {/* Manifesto */}
      <section id="why" className="border-b border-graphite">
        <div className="mx-auto max-w-page px-6 py-32">
          <div className="mx-auto max-w-[600px] text-center">
            <p className="meta">Why Grant Align</p>
            <h2 className="mt-8 text-balance text-heading-sm font-normal text-chalk">
              The scarcest thing a small non-profit has is grant-writing hours.
            </h2>
            <p className="mt-6 text-body leading-[1.6] text-smoke">
              Two organizations write nearly identical mission statements and do completely
              different work. A funder publishes guidelines that say what it supports but rarely
              what it quietly never funds. So applications get written on hope, and most of them
              were never eligible.
            </p>
            <p className="mt-5 text-body leading-[1.6] text-ash">
              The information that decides a grant is the information nobody writes down: the
              boundaries. Who you turn away. What you refer elsewhere. What a funder has declined
              three years running. Grant Align is built to ask for exactly that, from both sides,
              and to compare the answers.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-b border-graphite">
        <div className="mx-auto max-w-page px-6 py-32">
          <p className="meta">How it works</p>
          <h2 className="mt-8 max-w-2xl text-balance text-heading-lg font-normal text-chalk">
            One platform, two sides. Both feed the same evaluation.
          </h2>

          <div className="mt-20 grid border-t border-graphite md:grid-cols-2">
            {[
              ['For grant seekers', SEEKER_STEPS],
              ['For grant givers', DONOR_STEPS],
            ].map(([heading, steps], column) => (
              <div
                key={heading as string}
                className={`border-b border-graphite px-0 py-12 md:px-12 ${column === 0 ? 'md:border-r' : ''}`}
              >
                <h3 className="text-[14px] uppercase tracking-[0.06em] text-chalk">
                  {heading as string}
                </h3>
                <ol className="mt-10 space-y-10">
                  {(steps as string[][]).map(([title, body], i) => (
                    <li key={title} className="flex gap-6">
                      <span className="meta shrink-0 pt-0.5">0{i + 1}</span>
                      <div>
                        <p className="text-heading-xs font-normal text-chalk">{title}</p>
                        <p className="mt-3 text-[14px] leading-[1.6] text-smoke">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The engine */}
      <section id="engine" className="border-b border-graphite">
        <div className="mx-auto max-w-page px-6 py-32">
          <p className="meta">The engine</p>
          <h2 className="mt-8 max-w-3xl text-balance text-heading-lg font-normal text-chalk">
            Six weighted dimensions, so a seeker can see which one sank a match.
          </h2>

          <div className="mt-20 hairline rounded-lg p-10">
            <WorkflowDiagram />
          </div>

          <div className="mt-20 grid gap-16 lg:grid-cols-[1fr_1fr]">
            <Suspense fallback={null}>
              <ProofOfWork />
            </Suspense>

            <div className="grid border-t border-graphite sm:grid-cols-2">
              {PRINCIPLES.map(([title, body], i) => (
                <div
                  key={title}
                  className={`border-b border-graphite py-8 sm:px-8 ${i % 2 === 0 ? 'sm:border-r' : ''}`}
                >
                  <h3 className="text-[14px] uppercase tracking-[0.06em] text-chalk">{title}</h3>
                  <p className="mt-4 text-[14px] leading-[1.6] text-smoke">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Close */}
      <section className="border-b border-graphite bg-carbon">
        <div className="mx-auto max-w-page px-6 py-28 text-center">
          <h2 className="mx-auto max-w-2xl text-balance text-heading font-normal text-chalk">
            See it against real Frederick County funders.
          </h2>
          <p className="mt-5 text-body text-smoke">
            Live criteria, real IRS filings, and verdicts you can argue with.
          </p>
          <div className="mt-10 flex justify-center">
            <Link href="/login" className="pill-white">Sign in ↗</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-8 gap-y-3 px-6 py-10">
          <span className="text-[14px] text-chalk">GrantAlign</span>
          <span className="meta">Prototype — Frederick County, MD</span>
          <Link href="/login" className="meta ml-auto transition hover:text-chalk">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
