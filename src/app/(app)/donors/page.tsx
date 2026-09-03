import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/auth';
import { Card, EmptyState, PageHeader } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function DonorsPage() {
  // Staff only: this page lists every organization on the platform, which is
  // precisely what a seeker or funder must not see. Role-aware nav hides the
  // link, but the route has to refuse it too.
  await requireStaff();

  // A directory of every organization is a staff view. A seeker has no
  // business reading other non-profits' profiles, nor a funder its peers'.
  

  const donors = await prisma.organization.findMany({
    where: { kind: 'DONOR' },
    include: { donorProfile: true, _count: { select: { donorMatches: true } } },
    orderBy: [{ isSeed: 'desc' }, { name: 'asc' }],
  });

  return (
    <>
      <PageHeader
        title="Grant givers"
        subtitle="Regional funders and their live criteria. The scheduled research job keeps these current; each run's proposals wait for review before they land."
        action={
          <Link href="/donors/new" className="btn-primary">
            Add funder
          </Link>
        }
      />

      {donors.length === 0 ? (
        <EmptyState
          title="No funders yet"
          hint="Run `npm run db:seed` to load the local seed list, or add one by hand."
          cta={
            <Link href="/donors/new" className="btn-primary">
              Add funder
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {donors.map(org => {
              const profile = org.donorProfile;
              const focus = profile?.fundingFocus ?? [];
              return (
                <li key={org.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/donors/${org.id}`} className="text-sm font-medium hover:text-brand">
                      {org.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {focus.length > 0
                        ? focus.join(' · ')
                        : org.notes ?? 'No criteria captured yet'}
                    </p>
                  </div>
                  {profile?.nextDeadline && (
                    <span className="text-xs text-maybe">
                      Due {profile.nextDeadline.toLocaleDateString('en-US')}
                    </span>
                  )}
                  <span className="text-xs text-muted">
                    {profile?.lastResearchedAt
                      ? `Researched ${profile.lastResearchedAt.toLocaleDateString('en-US')}`
                      : 'Never researched'}
                  </span>
                  <span className="text-xs text-muted">{org._count.donorMatches} matches</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
