import Link from 'next/link';
import { listOrgOptions, listUnverifiedOrganizations, listUsers } from '@/lib/store';
import { Card, PageHeader } from '@/components/ui';
import { requireStaff } from '@/lib/auth';
import { approveJoinRequest, declineJoinRequest, updateMembership, verifyOrganization } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';

const ROLES = ['SEEKER', 'DONOR', 'STAFF'] as const;

/**
 * Staff view of who can sign in and what they can reach.
 *
 * Also the review queue for self-service sign-up: organizations created at
 * onboarding wait here to be verified before they enter matching, and requests
 * to join an existing organization wait here for approval. It is also the only
 * way to grant STAFF, which is deliberately not offered on the sign-up form.
 */
export default async function PeoplePage() {
  await requireStaff();

  const [users, organizations, unverified] = await Promise.all([
    listUsers(),
    listOrgOptions(),
    listUnverifiedOrganizations(),
  ]);
  const orgName = new Map(organizations.map(o => [o.id, o.name]));
  const requests = users.filter(u => u.requestedOrgId && !u.orgId);
  const creatorOf = new Map(users.map(u => [u.id, u]));

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Who can sign in, which role they hold, and which organization they can see."
      />

      {(unverified.length > 0 || requests.length > 0) && (
        <div className="mb-6 space-y-6">
          {unverified.length > 0 && (
            <Card title={`New organizations to review (${unverified.length})`}>
              <p className="mb-3 text-caption text-ink-muted">
                Created at sign-up. They stay out of matching until verified; check the name, website and EIN
                belong to a real organization and the creator works there.
              </p>
              <ul className="divide-y divide-line">
                {unverified.map(org => {
                  const creator = org.createdBy ? creatorOf.get(org.createdBy) : undefined;
                  return (
                    <li key={org.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${org.kind === 'SEEKER' ? 'seekers' : 'donors'}/${org.id}`}
                          className="text-body-sm font-medium text-ink hover:underline"
                        >
                          {org.name}
                        </Link>
                        <p className="text-caption text-ink-muted">
                          {org.kind === 'SEEKER' ? 'Non-profit' : 'Funder'}
                          {org.website && <> · {org.website}</>}
                          {org.ein && <> · EIN {org.ein}</>}
                          {creator && (
                            <>
                              {' '}· by {creator.name || creator.email}
                              {creator.emailVerified ? ' (email verified)' : ' (email not verified)'}
                            </>
                          )}
                        </p>
                      </div>
                      <form action={verifyOrganization.bind(null, org.id)}>
                        <button type="submit" className="btn-primary">Verify</button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          {requests.length > 0 && (
            <Card title={`Requests to join (${requests.length})`}>
              <ul className="divide-y divide-line">
                {requests.map(user => (
                  <li key={user.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm font-medium text-ink">{user.name || user.email}</p>
                      <p className="text-caption text-ink-muted">
                        {user.email}
                        {user.emailVerified ? ' (verified)' : ' (not verified)'} wants to join{' '}
                        <span className="font-medium text-ink">
                          {orgName.get(user.requestedOrgId!) ?? 'a deleted organization'}
                        </span>
                      </p>
                    </div>
                    <form action={approveJoinRequest.bind(null, user.id)}>
                      <button type="submit" className="btn-primary">Approve</button>
                    </form>
                    <form action={declineJoinRequest.bind(null, user.id)}>
                      <button type="submit" className="btn-secondary">Decline</button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}

      <Card>
        {users.length === 0 ? (
          <p className="field-empty">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {users.map(user => (
              <li key={user.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-body-sm font-medium">{user.name || user.email}</span>
                  {user.name && <span className="text-caption text-ink-muted">{user.email}</span>}
                  {!user.emailVerified && user.role !== 'STAFF' && (
                    <span className="text-caption text-ink-muted">· email not verified</span>
                  )}
                  <span className="ml-auto text-caption text-ink-muted">
                    {user.org?.name ?? (user.role === 'STAFF' ? 'all organizations' : 'no organization')}
                  </span>
                </div>

                <form
                  action={updateMembership.bind(null, user.id)}
                  className="mt-2.5 grid gap-2 sm:grid-cols-[9rem,1fr,auto]"
                >
                  <select name="role" defaultValue={user.role} className="input">
                    {ROLES.map(role => (
                      <option key={role} value={role}>
                        {role.toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <select name="orgId" defaultValue={user.orgId ?? ''} className="input">
                    <option value="">— no organization —</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.kind.toLowerCase()})
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary">Save</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <p className="mt-4 text-caption leading-relaxed text-ink-muted">
        A seeker or funder account sees exactly one organization. Staff see everything, so grant that
        role only to people running the platform.
      </p>
    </>
  );
}
