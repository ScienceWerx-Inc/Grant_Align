import { prisma } from '@/lib/db';
import { Card, PageHeader } from '@/components/ui';
import { requireStaff } from '@/lib/auth';
import { updateMembership } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';

const ROLES = ['SEEKER', 'DONOR', 'STAFF'] as const;

/**
 * Staff view of who can sign in and what they can reach.
 *
 * This is the approval step the prototype is missing elsewhere: onboarding lets
 * someone claim an organization unverified, so this page is where a staff
 * member corrects a wrong claim. It is also the only way to grant STAFF, which
 * is deliberately not offered on the sign-up form.
 */
export default async function PeoplePage() {
  await requireStaff();

  const [users, organizations] = await Promise.all([
    prisma.appUser.findMany({ include: { org: true }, orderBy: [{ role: 'asc' }, { email: 'asc' }] }),
    prisma.organization.findMany({ select: { id: true, name: true, kind: true }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="People"
        subtitle="Who can sign in, which role they hold, and which organization they can see."
      />

      <Card>
        {users.length === 0 ? (
          <p className="field-empty">No accounts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {users.map(user => (
              <li key={user.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm font-medium">{user.name || user.email}</span>
                  {user.name && <span className="text-xs text-muted">{user.email}</span>}
                  <span className="ml-auto text-xs text-muted">
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

      <p className="mt-4 text-xs leading-relaxed text-muted">
        A seeker or funder account sees exactly one organization. Staff see everything, so grant that
        role only to people running the platform.
      </p>
    </>
  );
}
