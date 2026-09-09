import { Suspense } from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { WorkflowDiagram } from '@/components/landing/Diagram';
import { SampleMatch } from '@/components/landing/SampleMatch';
import { AnimatedCounter } from '@/components/landing/AnimatedCounter';

export const dynamic = 'force-dynamic';

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

// Icons (Thin-line consistent style)
const IconWorld = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
const IconBuilding = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
const IconPeople = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const IconDocument = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const IconChart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="18" y="3" width="4" height="18"></rect><rect x="10" y="8" width="4" height="13"></rect><rect x="2" y="13" width="4" height="8"></rect></svg>;
const IconLocation = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;
const IconCheckCircle = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const IconHeart = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;

async function LiveStats({ layout = 'strip' }: { layout?: 'strip' | 'cards' }) {
  const stats = await landingData();
  if (!stats) return null;

  const data = [
    { value: stats.donors, label: 'Regional funders', Icon: IconWorld },
    { value: stats.researched, label: 'Researched live', Icon: IconPeople },
    { value: stats.seekers, label: 'Non-profit profiles', Icon: IconDocument },
    { value: stats.matches, label: 'Pairings evaluated', Icon: IconChart },
  ];

  if (layout === 'strip') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 md:gap-y-0 md:divide-x divide-line/50">
        {data.map(({ value, label, Icon }) => (
          <div key={label} className="flex flex-col items-center text-center px-4">
            <div className="text-brand-ink mb-4 scale-110"><Icon /></div>
            <div className="text-[40px] leading-none font-semibold text-ink mb-2"><AnimatedCounter value={value} /></div>
            <div className="text-body-sm text-ink-muted font-medium tracking-wide uppercase">{label}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-12">
      {data.map(({ value, label, Icon }) => (
        <div key={label} className="flex flex-col items-center text-center">
          <div className="text-brand-ink mb-3"><Icon /></div>
          <div className="text-3xl font-semibold text-ink mb-1"><AnimatedCounter value={value} /></div>
          <div className="text-[14px] text-ink opacity-80">{label}</div>
        </div>
      ))}
    </div>
  );
}

function LiveStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center space-y-3">
          <div className="h-6 w-6 rounded-full bg-black/5 animate-pulse" />
          <div className="h-10 w-16 bg-black/5 animate-pulse rounded" />
          <div className="h-4 w-24 bg-black/5 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

/**
 * The headline pairing, read live.
 *
 * This block used to hard-code "92%" against two named real organizations,
 * while the evidence card further down the same page rendered the engine's
 * actual score for that same pairing - 98. Two different numbers for one
 * match, on one page, one of them simply wrong.
 *
 * Names and score now come from the same query as everything else. The
 * photographs and the four descriptive lines under each are illustrative.
 */
async function FeaturedMatch() {
  const stats = await landingData();
  if (!stats?.sample) return null;
  const seekerName = stats.sample.seeker.name;
  const donorName = stats.sample.donor.name;
  const score = stats.sample.score;

  return (
    <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-12 mb-24 z-10">
      {/* Connecting line */}
      <div className="hidden md:block absolute top-1/2 left-0 w-full border-t border-dashed border-line-strong -z-10"></div>
      
      <div className="w-full md:w-[360px] relative">
        <span className="text-[11px] font-bold text-brand-ink uppercase tracking-widest mb-5 block">Nonprofit</span>
        <img src="/images/match-kitchen.jpg" alt="Kitchen" className="w-full h-40 object-cover contrast-[1.05] mix-blend-multiply mb-6" />
        <h3 className="font-semibold text-h3 text-brand-ink mb-4">{seekerName}</h3>
        <div className="space-y-2 text-body-sm text-ink-muted">
          <p>Food Security</p>
          <p>Frederick County, MD</p>
          <p>Community Programs</p>
          <p>501(c)(3)</p>
        </div>
      </div>

      <div className="relative shrink-0 w-48 h-48 bg-paper rounded-full border-8 border-paper flex flex-col items-center justify-center shadow-overlay z-10 before:absolute before:inset-0 before:rounded-full before:border before:border-line">
        <span className="text-display font-semibold text-brand-ink leading-none">{score}%</span>
        <span className="text-overline text-ink tracking-widest mt-2 uppercase">Match</span>
      </div>

      <div className="w-full md:w-[360px] relative">
        <span className="text-[11px] font-bold text-accent uppercase tracking-widest mb-5 block">Funder</span>
        <img src="/images/match-foundation.jpg" alt="Foundation" className="w-full h-40 object-cover contrast-[1.05] mix-blend-multiply mb-6" />
        <h3 className="font-semibold text-h3 text-brand-ink mb-4">{donorName}</h3>
        <div className="space-y-2 text-body-sm text-ink-muted">
          <p>Hunger Relief</p>
          <p>Maryland</p>
          <p>Community Health</p>
          <p>Grants $5K – $50K</p>
        </div>
      </div>
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
    <div className="min-h-screen bg-paper font-sans text-ink-body antialiased selection:bg-brand/20 bg-[url('/images/bg-waves.svg')] bg-fixed bg-cover bg-bottom relative">
      {/* 5. NAVIGATION */}
      <header className="h-[80px] bg-paper/90 backdrop-blur sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 border-b border-line/40">
        <Link href="/" className="flex items-center text-2xl font-bold tracking-tight">
          <span className="text-ink">Grant</span>
          <span className="text-brand-ink">Align</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10">
          {[
            ['#why', 'Why It Matters'],
            ['#how', 'How It Works'],
            ['#engine', 'The Engine'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="inline-flex min-h-[44px] items-center text-body-sm font-medium text-ink-muted hover:text-brand-ink transition-colors">
              {label}
            </a>
          ))}
        </nav>
        <Link href="/login" className="px-6 py-2.5 rounded-pill border border-transparent bg-brand text-brand-on text-body-sm font-semibold hover:bg-brand-hover transition-colors shadow-raised">
          Sign In
        </Link>
      </header>

      {/* 6. HERO SECTION */}
      <section className="px-6 md:px-12 pt-16 md:pt-28 pb-24 max-w-page mx-auto relative text-left">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 max-w-[720px] flex flex-col items-start opacity-0 animate-fade-in-up">
            <span className="block text-overline text-brand-ink mb-6 uppercase tracking-widest">PEOPLE • PURPOSE • POSSIBILITIES</span>
            <h1 className="text-display font-semibold text-brand-ink text-balance">
              Find the grants that actually fit your mission.
            </h1>
            <p className="mt-8 text-body-lg text-ink-body max-w-lg text-balance">
              Matching local non-profits to regional funders based on what an organization actually does — and explicitly does not do — rather than on mission-statement language.
            </p>
            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link href="/contact" className="inline-flex h-[52px] items-center px-8 rounded-pill bg-brand text-brand-on font-semibold hover:bg-brand-hover transition-all hover:scale-105 shadow-raised text-body-sm">
                Contact us &rarr;
              </Link>
              <a href="#how" className="inline-flex h-[52px] items-center px-8 rounded-pill border-2 border-brand bg-transparent text-brand-ink font-semibold hover:bg-brand-tint transition-all hover:scale-105 text-body-sm">
                See how it works &rarr;
              </a>
            </div>
            
            {/* 9. HERO TAGLINE DECORATION */}
            <div className="mt-16 hidden md:flex flex-col items-start justify-center relative">
              <span className="block font-serif italic text-h3 text-ink-muted">A more equitable tomorrow is possible.</span>
              <div className="w-16 h-0.5 bg-brand/30 mt-3 rounded-pill"></div>
            </div>
          </div>

          {/* 7. HERO ILLUSTRATION */}
          <div className="flex-1 relative w-full opacity-0 animate-fade-in-up-delay-1 mix-blend-multiply">
             <img src="/images/hero-community.png" alt="Community team working together" className="w-full h-auto object-contain mx-auto animate-float" />
          </div>
        </div>
      </section>

      {/* 10. STATS STRIP */}
      <section className="px-6 md:px-12 relative -mt-12 mb-32 max-w-page mx-auto z-10">
        <div className="bg-card shadow-overlay rounded-panel py-10 px-8 border border-line">
          <Suspense fallback={<LiveStatsSkeleton />}>
            <LiveStats layout="strip" />
          </Suspense>
        </div>
      </section>

      {/* 11. TRUST / COMMUNITY SECTION */}
      <section id="why" className="px-6 md:px-12 mb-32 max-w-page mx-auto">
        <div className="grid md:grid-cols-[1fr_1.1fr] gap-16 md:gap-24 items-center">
          <div>
            <span className="block text-overline text-brand-ink mb-6 uppercase">A Common Challenge</span>
            <h2 className="text-h1 font-semibold text-brand-ink text-balance mb-8">
              Great work is happening.<br/>
              But finding the right funding can be difficult.
            </h2>
            <p className="text-body-lg text-ink-body mb-6">
              Nonprofits spend valuable time searching for grants that aren't the right fit. Funders receive applications that don't align with their priorities. Good ideas get missed — and communities lose out.
            </p>
            <p className="text-h4 font-medium text-brand-ink">
              There's a better way.
            </p>
          </div>
          {/* 12. COMMUNITY IMAGE */}
          <div className="relative pt-6">
            <img src="/images/community-photo.png" alt="Community members outdoors" className="w-full h-auto object-cover contrast-[1.05] mix-blend-multiply hover:scale-[1.02] transition-transform duration-slow" />
          </div>
        </div>
      </section>

      {/* 13. ONE PLATFORM — TWO SIDES */}
      <section id="how" className="px-6 py-32 bg-band">
        <div className="max-w-page mx-auto">
          <div className="text-center mb-20">
            <span className="block text-overline text-accent mb-6 uppercase">One Platform, Two Sides</span>
            <h2 className="text-h2 md:text-h1 font-semibold text-brand-ink text-balance">
              A stronger, more connected community.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10">
            {/* 14. NONPROFIT CARD */}
            <div className="bg-brand-tint rounded-panel p-10 md:p-16 border border-brand/5 shadow-raised transition-transform hover:-translate-y-1">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-brand-ink mb-10 shadow-sm">
                <div className="scale-125"><IconPeople /></div>
              </div>
              <h3 className="text-h2 font-semibold text-brand-ink mb-6">For grant seekers</h3>
              <p className="text-body-lg text-ink-body mb-12">
                Save time, find the right opportunities, and focus on what you do best — making an impact.
              </p>
              <ul className="space-y-6 mb-14">
                {[
                  'Tell us what you actually do',
                  'Track your paperwork',
                  'Get a clear, relevant list of grants',
                  'See why each one is a good fit'
                ].map((item, i) => (
                  <li key={i} className="flex gap-5 items-start">
                    <span className="font-semibold text-brand-ink mt-0.5 opacity-60 text-body-sm">{i+1}</span>
                    <span className="font-medium text-ink">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-flex h-[48px] items-center px-8 rounded-pill bg-brand text-brand-on font-semibold hover:bg-brand-hover transition-colors text-body-sm">
                Start seeking &rarr;
              </Link>
            </div>

            {/* 15. FUNDER CARD */}
            <div className="bg-accent-tint rounded-panel p-10 md:p-16 border border-accent/5 shadow-raised transition-transform hover:-translate-y-1">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-accent mb-10 shadow-sm">
                <div className="scale-125"><IconBuilding /></div>
              </div>
              <h3 className="text-h2 font-semibold text-accent mb-6">For grant givers</h3>
              <p className="text-body-lg text-ink-body mb-12">
                Discover mission-aligned organizations and fund with greater confidence.
              </p>
              <ul className="space-y-6 mb-14">
                {[
                  'Your criteria, kept current',
                  'Say what guidelines cannot',
                  'See who fits'
                ].map((item, i) => (
                  <li key={i} className="flex gap-5 items-start">
                    <span className="font-semibold text-accent mt-0.5 opacity-60 text-body-sm">{i+1}</span>
                    <span className="font-medium text-ink">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/login" className="inline-flex h-[48px] items-center px-8 rounded-pill bg-accent text-accent-on font-semibold hover:opacity-90 transition-opacity text-body-sm">
                Start giving &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 16. MATCHING SECTION */}
      <section className="px-6 md:px-12 py-32 max-w-page mx-auto relative">
        <div className="text-center max-w-2xl mx-auto mb-24">
          <span className="block text-overline text-brand-ink mb-4 uppercase tracking-widest">How It Works</span>
          <h2 className="text-h2 md:text-h1 font-semibold text-brand-ink text-balance mb-6">
            Real matches. Real impact.
          </h2>
          <p className="text-body-lg text-ink-body">
            GrantAlign uses six weighted dimensions to connect nonprofits with funders who are the right fit — based on substance, not just keywords.
          </p>
        </div>

        {/* 17. MATCH VISUALIZATION */}
        <Suspense fallback={null}>
          <FeaturedMatch />
        </Suspense>

        {/* 18. MATCHING STATS */}
        <div className="max-w-4xl mx-auto border-t border-line pt-16">
          <Suspense fallback={<LiveStatsSkeleton />}>
            <LiveStats layout="strip" />
          </Suspense>
        </div>
      </section>

      {/* 19. ENGINE SECTION */}
      <section id="engine" className="bg-band py-32 px-6">
        <div className="max-w-page mx-auto">
          <div className="flex flex-col gap-24">
            <div className="max-w-5xl mx-auto text-center">
              <span className="block text-overline text-accent mb-6 uppercase">The Engine</span>
              <h2 className="text-h2 md:text-h1 font-semibold text-brand-ink text-balance mb-8">
                Six weighted dimensions,<br/>
                so a seeker can see which one sank a match.
              </h2>
              <p className="text-body-lg text-ink-body mb-16 max-w-2xl mx-auto">
                Our matching engine looks beyond keywords to understand real alignment, using six key dimensions:
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-left">
                {[
                  /*
                   * The engine's own six, in its order and its wording - see
                   * DIMENSIONS in src/ai/flows/scoreMatch.ts. This list used to
                   * advertise "Grant-making organization size", which the
                   * engine does not score at all, and omit donor exclusions,
                   * which carries 15% of the result.
                   */
                  { label: 'Mission & program fit', Icon: IconCheckCircle },
                  { label: 'Population served', Icon: IconPeople },
                  { label: 'Geographic eligibility', Icon: IconLocation },
                  { label: 'Clear of donor exclusions', Icon: IconBuilding },
                  { label: 'Grant size vs. organization scale', Icon: IconChart },
                  { label: 'Documentation readiness', Icon: IconDocument }
                ].map(({ label, Icon }) => (
                  <div key={label} className="flex items-center gap-4 bg-white p-4 rounded-card border border-line shadow-sm">
                    <div className="text-brand-ink shrink-0"><Icon /></div>
                    <span className="text-body-sm font-medium text-ink leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* 20. ENGINE DIAGRAM */}
            <div className="bg-card rounded-panel p-8 md:p-12 border border-line shadow-overlay max-w-5xl mx-auto w-full">
              <WorkflowDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* 21. REAL DATA / EVIDENCE SECTION */}
      {/* overflow-x-clip: the decorative -inset-8 blur below bleeds 32px past its
          parent, which pushed the whole document 8px wide at 375px. Clipping only
          the x axis contains it without flattening the vertical bleed. */}
      <section className="py-32 px-6 max-w-page mx-auto overflow-x-clip">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            {[
              { title: 'Negative scope', body: 'What an organization does NOT do, and who a funder will NOT fund. Our engine surfaces this one “skip this one” with confidence.', Icon: IconLocation },
              { title: 'Research with sources', body: 'Every proposed criterion carries the page it came from. Nothing reaches a live profile without a source.', Icon: IconDocument },
              { title: 'Blockers over scores', body: 'A stated exclusion, an out-of-area address or missing mandatory paperwork forces a skip regardless of the numeric fit.', Icon: IconChart },
            ].map(({title, body, Icon}) => (
              <div key={title} className="flex gap-6 items-start">
                <div className="shrink-0 w-14 h-14 rounded-full bg-brand-tint text-brand-ink flex items-center justify-center border border-brand/10">
                  <Icon />
                </div>
                <div>
                  <h3 className="text-h4 font-semibold text-brand-ink mb-2">{title}</h3>
                  <p className="text-body text-ink-muted leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 22. REAL EVALUATION CARD */}
          <div className="relative isolate">
             <div className="absolute -inset-8 bg-gradient-to-tr from-brand-tint/50 to-transparent rounded-panel -z-10 blur-xl"></div>
            <Suspense fallback={null}>
              <ProofOfWork />
            </Suspense>
          </div>
        </div>
      </section>

      {/* 23. TESTIMONIAL / HUMAN SECTION */}
      <section className="py-32 px-6">
        <div className="max-w-page mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <img src="/images/human_leader_illustration.jpg" alt="Community leader" className="w-full h-auto object-cover contrast-[1.05] mix-blend-multiply" />
          </div>
          <div className="relative isolate px-8 md:px-12">
            <span className="block text-overline text-brand-ink mb-8 uppercase">People. Partnerships. Progress.</span>
            <blockquote className="text-display font-serif italic text-brand-ink leading-[1.1] mb-8 relative">
              <span className="absolute -left-8 -top-4 text-[80px] text-brand-ink/20 font-serif">“</span>
              The right partnership can turn a good idea into lasting change.
              <span className="absolute -bottom-8 -right-4 text-[80px] text-brand-ink/20 font-serif leading-none">”</span>
            </blockquote>
            <div className="w-20 h-1 bg-accent rounded-pill"></div>
          </div>
        </div>
      </section>

      {/* 24. FINAL CTA */}
      <section className="px-6 py-32">
        <div className="max-w-5xl mx-auto bg-brand-tint rounded-[40px] p-16 md:p-24 text-center relative overflow-hidden border border-brand/5 shadow-overlay">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-h1 font-semibold text-brand-ink text-balance mb-6">See it against real Frederick County funders.</h2>
            <p className="text-body-lg text-ink-body mb-12">Live criteria, real IRS filings, and a reason behind every verdict.</p>
            <Link href="/login" className="inline-flex h-[56px] items-center px-10 rounded-pill bg-brand text-brand-on font-semibold text-body-sm hover:bg-brand-hover transition-colors shadow-raised">
              Get a quote &rarr;
            </Link>
          </div>
          {/* Decorative Phrase */}
          <div className="absolute right-12 top-16 font-serif italic text-brand-ink/40 text-h3 transform rotate-3 hidden lg:block text-right">
            Good ideas<br/>build brighter<br/>communities. <span className="text-accent">♥</span>
          </div>
          {/* Organic Background Decorations */}
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-brand/5 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand/5 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* 25. FOOTER */}
      <footer className="border-t border-line px-6 py-12">
        <div className="max-w-page mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <div className="text-xl font-bold tracking-tight mb-1">
              <span className="text-ink">Grant</span>
              <span className="text-brand-ink">Align</span>
            </div>
            <div className="text-[13px] text-ink-muted font-medium">People. Progress. Possibilities.</div>
          </div>
          <nav className="flex items-center gap-8 text-body-sm font-medium text-ink-body">
            <a href="#why" className="inline-flex min-h-[44px] items-center hover:text-brand-ink transition-colors">Why It Matters</a>
            <a href="#how" className="inline-flex min-h-[44px] items-center hover:text-brand-ink transition-colors">How It Works</a>
            <a href="#engine" className="inline-flex min-h-[44px] items-center hover:text-brand-ink transition-colors">The Engine</a>
            <Link href="/contact" className="inline-flex min-h-[44px] items-center hover:text-brand-ink transition-colors">Contact</Link>
          </nav>
          <Link href="/login" className="inline-flex min-h-[44px] items-center text-body-sm font-semibold text-brand-ink hover:underline">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
