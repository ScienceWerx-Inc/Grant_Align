import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireOrgAccess } from '@/lib/auth';
import { Card, Field, PageHeader, Tags } from '@/components/ui';
import { InterviewPanel } from '@/components/InterviewPanel';
import { MatchRunner } from '@/components/MatchRunner';
import { OrgContacts } from '@/components/OrgContacts';
import { ComplianceCard } from '@/components/ComplianceCard';
import { MatchCard } from '@/components/MatchList';
import { updateSeekerProfile } from '@/lib/actions';
import type { InterviewMessage } from '@/ai/flows/interviewer';

export const dynamic = 'force-dynamic';

export default async function SeekerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Checked before the record is read. The id comes from the URL, which is the
  // most likely route for one organization's data to reach another.
  await requireOrgAccess(id);

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      seekerProfile: true,
      contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      compliance: { orderBy: { type: 'asc' } },
      seekerMatches: { include: { donor: true }, orderBy: { score: 'desc' } },
      interviews: { where: { role: 'SEEKER' }, orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  });
  if (!org || org.kind !== 'SEEKER') notFound();

  const profile = org.seekerProfile;
  const session = org.interviews[0];
  const messages = ((session?.messages as unknown as InterviewMessage[]) ?? []).map(m => ({
    role: m.role,
    content: m.content,
  }));

  return (
    <>
      <PageHeader
        title={org.name}
        subtitle={org.mission ?? undefined}
        action={
          <>
            <Link href={`/seekers/${org.id}/one-pager`} className="btn-secondary">
              1-pager
            </Link>
            <MatchRunner seekerId={org.id} label="Run matching" />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,26rem]">
        <div className="space-y-6">
          <Card
            title="Operational profile"
            action={
              <span className="text-xs text-muted">
                {profile?.interviewComplete ? 'Interview complete' : 'Interview incomplete'}
              </span>
            }
          >
            <form action={updateSeekerProfile.bind(null, org.id)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="servesWho">Who they really serve</label>
                  <textarea id="servesWho" name="servesWho" rows={3} defaultValue={profile?.servesWho ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="doesWhat">What they really do</label>
                  <textarea id="doesWhat" name="doesWhat" rows={3} defaultValue={profile?.doesWhat ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="doesNotDo">What they do NOT do</label>
                  <textarea id="doesNotDo" name="doesNotDo" rows={3} defaultValue={profile?.doesNotDo ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="doesNotServe">Who they do NOT serve</label>
                  <textarea id="doesNotServe" name="doesNotServe" rows={3} defaultValue={profile?.doesNotServe ?? ''} className="input" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label" htmlFor="populations">Populations (comma separated)</label>
                  <input id="populations" name="populations" defaultValue={profile?.populations.join(', ') ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="serviceAreas">Service areas</label>
                  <input id="serviceAreas" name="serviceAreas" defaultValue={profile?.serviceAreas.join(', ') ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="programAreas">Program areas</label>
                  <input id="programAreas" name="programAreas" defaultValue={profile?.programAreas.join(', ') ?? ''} className="input" />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="outcomes">Evidenced outcomes</label>
                <textarea id="outcomes" name="outcomes" rows={2} defaultValue={profile?.outcomes ?? ''} className="input" />
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="label" htmlFor="yearFounded">Founded</label>
                  <input id="yearFounded" name="yearFounded" defaultValue={profile?.yearFounded ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="annualBudget">Annual budget</label>
                  <input id="annualBudget" name="annualBudget" defaultValue={profile?.annualBudget ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="staffCount">Paid staff</label>
                  <input id="staffCount" name="staffCount" defaultValue={profile?.staffCount ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="volunteerCount">Volunteers</label>
                  <input id="volunteerCount" name="volunteerCount" defaultValue={profile?.volunteerCount ?? ''} className="input" />
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="btn-secondary">Save profile</button>
              </div>
            </form>
          </Card>

          <ComplianceCard orgId={org.id} items={org.compliance} />

          <Card title={`Matches (${org.seekerMatches.length})`}>
            {org.seekerMatches.length === 0 ? (
              <p className="field-empty">
                No funders evaluated yet. Run matching once the profile has substance.
              </p>
            ) : (
              <div className="space-y-2">
                {org.seekerMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    counterparty={match.donor}
                    href={`/donors/${match.donorOrgId}`}
                  />
                ))}
              </div>
            )}
          </Card>

          <OrgContacts orgId={org.id} contacts={org.contacts} />
        </div>

        <div className="space-y-6">
          <Card title="AI interviewer">
            <InterviewPanel
              orgId={org.id}
              role="SEEKER"
              initialMessages={messages}
              initialSessionId={session?.id ?? null}
              initialDone={session?.status === 'COMPLETE'}
            />
          </Card>

          <Card title="Record">
            <dl className="space-y-3">
              <Field label="EIN" value={org.ein} />
              <Field label="Website" value={org.website} />
              <Field
                label="Address"
                value={[org.addressLine, org.city, org.state, org.postalCode].filter(Boolean).join(', ')}
              />
              <Field label="Phone" value={org.phone} />
              <Field label="Notes" value={org.notes} />
              <div>
                <dt className="label">Program areas</dt>
                <dd className="mt-1"><Tags items={profile?.programAreas ?? []} /></dd>
              </div>
            </dl>
          </Card>

          {session?.summary && (
            <Card title="Interview summary">
              <p className="whitespace-pre-wrap text-sm">{session.summary}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
