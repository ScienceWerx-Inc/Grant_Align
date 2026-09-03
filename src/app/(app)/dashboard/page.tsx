import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, EmptyState, PageHeader, StatTile, VerdictBadge } from '@/components/ui';
import { REQUIRED_COMPLIANCE } from '@/lib/profile-text';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [seekers, donors, applyCount, unresearched, topMatches, incomplete] = await Promise.all([
    prisma.organization.count({ where: { kind: 'SEEKER' } }),
    prisma.organization.count({ where: { kind: 'DONOR' } }),
    prisma.match.count({ where: { verdict: 'APPLY' } }),
    prisma.organization.count({
      where: {
        kind: 'DONOR',
        OR: [{ donorProfile: null }, { donorProfile: { lastResearchedAt: null } }],
      },
    }),
    prisma.match.findMany({
      where: { verdict: { in: ['APPLY', 'MAYBE'] } },
      orderBy: { score: 'desc' },
      take: 6,
      include: { seeker: true, donor: true },
    }),
    prisma.organization.findMany({
      where: {
        kind: 'SEEKER',
        OR: [
          { seekerProfile: null },
          { seekerProfile: { interviewComplete: false } },
          { compliance: { some: { type: { in: REQUIRED_COMPLIANCE }, status: { not: 'VERIFIED' } } } },
        ],
      },
      include: { seekerProfile: true, compliance: true },
      take: 6,
      orderBy: { name: 'asc' },
    }),
  ]);

  // A donor with no criteria cannot be matched against, so it belongs in the
  // same list as an un-interviewed seeker: both are reasons the engine has
  // nothing to say.
  const donorsNeedingWork = await prisma.organization.findMany({
    where: {
      kind: 'DONOR',
      OR: [{ donorProfile: null }, { donorProfile: { fundingFocus: { isEmpty: true } } }],
    },
    include: { donorProfile: true },
    take: 6,
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Where the matching stands, and what is blocking the rest of it."
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <StatTile label="Grant seekers" value={seekers} href="/seekers" />
        <StatTile label="Grant givers" value={donors} href="/donors" />
        <StatTile label="Recommended applications" value={applyCount} href="/matches" />
        <StatTile label="Donors never researched" value={unresearched} href="/donors" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Strongest matches">
          {topMatches.length === 0 ? (
            <EmptyState
              title="No matches scored yet"
              hint="Interview at least one seeker, research a donor's criteria, then run the matching engine."
              cta={
                <Link href="/matches" className="btn-primary">
                  Go to matches
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-line">
              {topMatches.map(match => (
                <li key={match.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <VerdictBadge verdict={match.verdict} score={match.score} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      <Link href={`/seekers/${match.seekerOrgId}`} className="hover:text-brand">
                        {match.seeker.name}
                      </Link>
                      <span className="mx-1.5 text-muted">→</span>
                      <Link href={`/donors/${match.donorOrgId}`} className="hover:text-brand">
                        {match.donor.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">{match.headline}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Needs attention">
          {incomplete.length === 0 && donorsNeedingWork.length === 0 ? (
            <p className="field-empty">
              Every seeker is interviewed and documented, and every funder has criteria.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {incomplete.map(org => {
                const missing = org.compliance.filter(
                  c => REQUIRED_COMPLIANCE.includes(c.type) && c.status !== 'VERIFIED',
                ).length;
                const reasons = [
                  org.seekerProfile?.interviewComplete ? null : 'interview incomplete',
                  missing > 0 ? `${missing} document${missing === 1 ? '' : 's'} unverified` : null,
                ].filter(Boolean);
                return (
                  <li key={org.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/seekers/${org.id}`} className="text-sm font-medium hover:text-brand">
                      {org.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted">{reasons.join(' · ')}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {donorsNeedingWork.length > 0 && (
            <div className={incomplete.length > 0 ? 'mt-5 border-t border-line pt-4' : ''}>
              <p className="label">Funders without criteria</p>
              <ul className="mt-1 space-y-1.5">
                {donorsNeedingWork.map(org => (
                  <li key={org.id} className="flex items-baseline justify-between gap-3">
                    <Link href={`/donors/${org.id}`} className="text-sm hover:text-brand">
                      {org.name}
                    </Link>
                    <span className="shrink-0 text-xs text-muted">
                      {/* "found nothing" would be wrong: research often returns
                          IRS financials and no published focus areas, which is
                          a real result. Name the gap, not a failure. */}
                      {org.donorProfile?.lastResearchedAt
                        ? 'no funding areas found'
                        : 'never researched'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
