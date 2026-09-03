import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { Card, EmptyState, PageHeader, VerdictBadge } from '@/components/ui';
import { MatchRunner } from '@/components/MatchRunner';
import { MatchCard } from '@/components/MatchList';

export const dynamic = 'force-dynamic';

/**
 * Matches grouped by seeker, because that is how the answer gets used: a
 * non-profit sits down with a list of funders and decides where its next
 * twenty hours of grant writing go.
 */
export default async function MatchesPage() {
  const user = await requireUser();

  /*
   * Matches are grouped by seeker for everyone, but scoped three ways:
   *
   *  - STAFF see every pairing.
   *  - A SEEKER sees only its own row.
   *  - A DONOR sees seekers matched against IT, and only those matches - hence
   *    the nested `where` on seekerMatches. Without it a funder would receive
   *    every seeker's evaluations against every other funder, which is
   *    commercially sensitive in both directions.
   *
   * A user with no organization yet matches nothing rather than everything.
   */
  const isStaff = user.role === 'STAFF';
  const donorFilter = user.role === 'DONOR' ? { donorOrgId: user.orgId ?? '__none__' } : {};

  const seekers = await prisma.organization.findMany({
    where: {
      kind: 'SEEKER',
      seekerMatches: { some: donorFilter },
      ...(user.role === 'SEEKER' ? { id: user.orgId ?? '__none__' } : {}),
    },
    include: {
      seekerMatches: {
        where: donorFilter,
        include: { donor: true },
        orderBy: { score: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const total = seekers.reduce((sum, s) => sum + s.seekerMatches.length, 0);

  return (
    <>
      <PageHeader
        title="Matches"
        subtitle={
          total > 0
            ? `${total} funder pairings evaluated against operational scope, exclusions, geography and documentation.`
            : undefined
        }
      />

      {isStaff && (
        <div className="mb-6">
          <MatchRunner />
        </div>
      )}

      {seekers.length === 0 ? (
        <EmptyState
          title="Nothing scored yet"
          hint="The engine needs a seeker with a real profile and a funder with real criteria. Interview a non-profit, research a donor, then run matching."
          cta={
            <Link href="/seekers" className="btn-primary">
              Go to grant seekers
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {seekers.map(seeker => {
            const apply = seeker.seekerMatches.filter(m => m.verdict === 'APPLY').length;
            return (
              <Card
                key={seeker.id}
                title={seeker.name}
                action={
                  <span className="text-xs text-muted">
                    {apply} recommended of {seeker.seekerMatches.length} evaluated
                  </span>
                }
              >
                <div className="space-y-2">
                  {seeker.seekerMatches.map(match => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      counterparty={match.donor}
                      href={`/donors/${match.donorOrgId}`}
                    />
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
