import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Card, EmptyState, PageHeader } from '@/components/ui';
import { REQUIRED_COMPLIANCE } from '@/lib/profile-text';

export const dynamic = 'force-dynamic';

export default async function SeekersPage() {
  const seekers = await prisma.organization.findMany({
    where: { kind: 'SEEKER' },
    include: {
      seekerProfile: true,
      compliance: true,
      _count: { select: { seekerMatches: true } },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <>
      <PageHeader
        title="Grant seekers"
        subtitle="Local non-profits, with the qualitative profile the matching engine reads."
        action={
          <Link href="/seekers/new" className="btn-primary">
            Add non-profit
          </Link>
        }
      />

      {seekers.length === 0 ? (
        <EmptyState
          title="No non-profits yet"
          hint="Add an organization, then run the AI interview to capture what it really does."
          cta={
            <Link href="/seekers/new" className="btn-primary">
              Add non-profit
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-line">
            {seekers.map(org => {
              const verified = org.compliance.filter(
                c => REQUIRED_COMPLIANCE.includes(c.type) && c.status === 'VERIFIED',
              ).length;
              return (
                <li key={org.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/seekers/${org.id}`} className="text-sm font-medium hover:text-brand">
                      {org.name}
                    </Link>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {org.seekerProfile?.doesWhat ?? org.mission ?? 'No profile captured yet'}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {org.seekerProfile?.interviewComplete ? 'Interviewed' : 'Interview pending'}
                  </span>
                  <span className="text-xs text-muted">
                    {verified}/{REQUIRED_COMPLIANCE.length} docs
                  </span>
                  <span className="text-xs text-muted">{org._count.seekerMatches} matches</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
