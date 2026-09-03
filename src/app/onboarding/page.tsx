import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { claimOrganization, signOut } from '@/lib/auth-actions';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Links a new account to an organization.
 *
 * Presented as a claim rather than a verification, and labelled as such: for
 * the prototype anyone signed in can attach themselves to any organization of
 * their own kind. That is the one place this auth model is knowingly weak, and
 * hiding it in a friendly flow would be worse than saying so on the page.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  if (user.role === 'STAFF') redirect('/dashboard');
  if (user.orgId) redirect(user.role === 'SEEKER' ? `/seekers/${user.orgId}` : `/donors/${user.orgId}`);

  const kind = user.role === 'DONOR' ? 'DONOR' : 'SEEKER';
  const organizations = await prisma.organization.findMany({
    where: { kind },
    select: { id: true, name: true, city: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="mx-auto max-w-lg px-6 py-20">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Grant<span className="text-brand">Align</span>
      </Link>

      <h1 className="mt-8 text-xl font-semibold tracking-tight">
        Which organization do you work for?
      </h1>
      <p className="mt-2 text-sm text-muted">
        {kind === 'SEEKER'
          ? 'Pick your non-profit. You will only ever see your own organization and its matches.'
          : 'Pick your foundation. You will only ever see your own criteria and the non-profits that match them.'}
      </p>

      {organizations.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line px-6 py-8 text-center">
          <p className="text-sm font-medium">No organizations to join yet</p>
          <p className="mt-1 text-sm text-muted">
            A staff member has to add your organization before you can claim it.
          </p>
        </div>
      ) : (
        <form action={claimOrganization} className="mt-8 space-y-4">
          <div>
            <label className="label" htmlFor="orgId">Organization</label>
            <select id="orgId" name="orgId" required className="input">
              <option value="">Select…</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                  {org.city ? ` — ${org.city}` : ''}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary w-full py-2.5">Continue</button>
        </form>
      )}

      <p className="mt-6 rounded-md bg-maybe/10 px-3 py-2.5 text-xs leading-relaxed">
        <strong className="font-semibold">Prototype note:</strong> this claim is not verified. In a
        real deployment it needs staff approval or email-domain matching, or anyone could claim to
        work at a foundation and read its private giving notes.
      </p>

      <form action={signOut} className="mt-6">
        <button type="submit" className="text-sm text-muted hover:text-ink">Sign out</button>
      </form>
    </div>
  );
}
