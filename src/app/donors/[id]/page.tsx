import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { Card, Field, PageHeader } from '@/components/ui';
import { InterviewPanel } from '@/components/InterviewPanel';
import { ActionButton } from '@/components/ActionButton';
import { OrgContacts } from '@/components/OrgContacts';
import { ResearchRuns } from '@/components/ResearchRuns';
import { MatchCard } from '@/components/MatchList';
import { updateDonorProfile } from '@/lib/actions';
import type { InterviewMessage } from '@/ai/flows/interviewer';

export const dynamic = 'force-dynamic';

export default async function DonorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      donorProfile: true,
      contacts: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      researchRuns: { orderBy: { startedAt: 'desc' }, take: 5 },
      donorMatches: { include: { seeker: true }, orderBy: { score: 'desc' } },
      interviews: { where: { role: 'DONOR' }, orderBy: { updatedAt: 'desc' }, take: 1 },
    },
  });
  if (!org || org.kind !== 'DONOR') notFound();

  const profile = org.donorProfile;
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
            <ActionButton
              endpoint="/api/donors/research"
              body={{ orgId: org.id }}
              label="Research criteria"
              pendingLabel="Researching…"
              variant="secondary"
              successMessage="Criteria proposed — review them below."
            />
            <ActionButton
              endpoint="/api/matches/run"
              body={{ donorId: org.id }}
              label="Find matching non-profits"
              pendingLabel="Matching…"
              successMessage="Evaluated {evaluated} non-profit(s)."
            />
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,26rem]">
        <div className="space-y-6">
          <Card
            title="Giving criteria"
            action={
              <span className="text-xs text-muted">
                {profile?.lastResearchedAt
                  ? `Researched ${profile.lastResearchedAt.toLocaleDateString('en-US')}${
                      profile.researchGrounded ? '' : ' (unverified)'
                    }`
                  : 'Never researched'}
              </span>
            }
          >
            <form action={updateDonorProfile.bind(null, org.id)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="fundingFocus">Funds (comma separated)</label>
                  <input id="fundingFocus" name="fundingFocus" defaultValue={profile?.fundingFocus.join(', ') ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="excludedSectors">Will NOT fund</label>
                  <input id="excludedSectors" name="excludedSectors" defaultValue={profile?.excludedSectors.join(', ') ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="populationsServed">Populations prioritized</label>
                  <input id="populationsServed" name="populationsServed" defaultValue={profile?.populationsServed.join(', ') ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="geographies">Geographies funded</label>
                  <input id="geographies" name="geographies" defaultValue={profile?.geographies.join(', ') ?? ''} className="input" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div>
                  <label className="label" htmlFor="grantMin">Smallest award</label>
                  <input id="grantMin" name="grantMin" defaultValue={profile?.grantMin ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="grantMax">Largest award</label>
                  <input id="grantMax" name="grantMax" defaultValue={profile?.grantMax ?? ''} className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="nextDeadline">Next deadline</label>
                  <input
                    id="nextDeadline"
                    name="nextDeadline"
                    type="date"
                    defaultValue={profile?.nextDeadline?.toISOString().slice(0, 10) ?? ''}
                    className="input"
                  />
                </div>
                <div>
                  <label className="label" htmlFor="applicationPortal">Portal</label>
                  <input id="applicationPortal" name="applicationPortal" defaultValue={profile?.applicationPortal ?? ''} className="input" placeholder="Foundant" />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="cycleNotes">Cycle notes</label>
                <textarea id="cycleNotes" name="cycleNotes" rows={2} defaultValue={profile?.cycleNotes ?? ''} className="input" />
              </div>

              <div>
                <label className="label" htmlFor="applicationUrl">Application URL</label>
                <input id="applicationUrl" name="applicationUrl" defaultValue={profile?.applicationUrl ?? ''} className="input" />
              </div>

              <div>
                <label className="label" htmlFor="givingNotes">Giving notes</label>
                <textarea id="givingNotes" name="givingNotes" rows={3} defaultValue={profile?.givingNotes ?? ''} className="input" />
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="requiresLoi" defaultChecked={profile?.requiresLoi} className="rounded border-line" />
                  Letter of intent first
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="requires990" defaultChecked={profile?.requires990 ?? true} className="rounded border-line" />
                  Requires Form 990
                </label>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="requiresGoodStanding" defaultChecked={profile?.requiresGoodStanding ?? true} className="rounded border-line" />
                  Requires good standing
                </label>
                <button type="submit" className="btn-secondary ml-auto">Save criteria</button>
              </div>
            </form>
          </Card>

          <ResearchRuns runs={org.researchRuns} />

          <Card title={`Matching non-profits (${org.donorMatches.length})`}>
            {org.donorMatches.length === 0 ? (
              <p className="field-empty">No non-profits evaluated against this funder yet.</p>
            ) : (
              <div className="space-y-2">
                {org.donorMatches.map(match => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    counterparty={match.seeker}
                    href={`/seekers/${match.seekerOrgId}`}
                  />
                ))}
              </div>
            )}
          </Card>

          <OrgContacts orgId={org.id} contacts={org.contacts} />
        </div>

        <div className="space-y-6">
          <Card title="AI donor interviewer">
            <InterviewPanel
              orgId={org.id}
              role="DONOR"
              initialMessages={messages}
              initialSessionId={session?.id ?? null}
              initialDone={session?.status === 'COMPLETE'}
            />
          </Card>

          <Card title="Record">
            <dl className="space-y-3">
              <Field label="Website" value={org.website} />
              <Field label="Location" value={[org.city, org.state].filter(Boolean).join(', ')} />
              <Field label="Notes" value={org.notes} />
              <Field label="Seed donor" value={org.isSeed ? 'Yes — prepopulated local list' : 'No'} />
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
