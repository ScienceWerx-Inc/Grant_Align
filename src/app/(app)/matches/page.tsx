import Link from 'next/link';
import { getOrganization, listMatches } from '@/lib/store';
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
  const donorOrgId = user.role === 'DONOR' ? (user.orgId ?? '__none__') : undefined;
  const seekerId = user.role === 'SEEKER' ? (user.orgId ?? '__none__') : undefined;

  const matches = await listMatches({
    ...(seekerId ? { seekerOrgId: seekerId } : {}),
    ...(donorOrgId ? { donorOrgId } : {}),
  });

  // Group by seeker, newest-best first within each group.
  const bySeeker = new Map<string, typeof matches>();
  for (const m of matches) {
    const group = bySeeker.get(m.seekerOrgId) ?? [];
    group.push(m);
    bySeeker.set(m.seekerOrgId, group);
  }
  const seekers = (
    await Promise.all(
      [...bySeeker.entries()].map(async ([id, seekerMatches]) => {
        const seeker = await getOrganization(id);
        if (!seeker) return null;
        const withDonors = (
          await Promise.all(
            seekerMatches.map(async match => {
              const donor = await getOrganization(match.donorOrgId);
              return donor ? { ...match, donor } : null;
            }),
          )
        ).filter((m): m is typeof seekerMatches[number] & { donor: NonNullable<Awaited<ReturnType<typeof getOrganization>>> } => m !== null);
        withDonors.sort((a, b) => b.score - a.score);
        return { ...seeker, seekerMatches: withDonors };
      }),
    )
  )
    .filter((s): s is NonNullable<typeof s> => s !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

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
                  <span className="text-caption text-ink-muted">
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
