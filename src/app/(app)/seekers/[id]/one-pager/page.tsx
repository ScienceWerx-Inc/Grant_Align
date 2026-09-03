import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth';
import { PageHeader } from '@/components/ui';
import { OnePagerView } from '@/components/OnePagerView';

export const dynamic = 'force-dynamic';

export default async function OnePagerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Checked before the record is read. The id comes from the URL, which is the
  // most likely route for one organization's data to reach another.
  await requireOrgAccess(id);
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { seekerProfile: true },
  });
  if (!org || org.kind !== 'SEEKER') notFound();

  return (
    <>
      <div className="no-print">
        <PageHeader
          title={`${org.name} — 1-pager`}
          subtitle="A standardized one-page summary for funders, built only from what this organization has actually told us."
          action={
            <Link href={`/seekers/${org.id}`} className="btn-secondary">
              Back to profile
            </Link>
          }
        />
        {!org.seekerProfile?.interviewComplete && (
          <p className="mb-6 rounded-md bg-maybe/10 px-4 py-3 text-sm text-ink">
            The AI interview for this organization is not finished, so the sheet will have gaps.
            Completing it first produces a far more concrete 1-pager.
          </p>
        )}
      </div>
      <OnePagerView orgId={org.id} />
    </>
  );
}
