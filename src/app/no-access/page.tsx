import Link from 'next/link';
import { getSessionUser, homePathFor } from '@/lib/auth';
import { signOut } from '@/lib/auth-actions';

export const dynamic = 'force-dynamic';

/** Where an authorization failure lands. Deliberately says nothing about what
 *  was being accessed - confirming that an organization exists is itself a
 *  small leak. */
export default async function NoAccessPage() {
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">You do not have access to that</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Your account can only see its own organization. If you think this is wrong, ask a staff
        member to check which organization your account is linked to.
      </p>

      <div className="mt-8 flex justify-center gap-3">
        {user && (
          <Link href={homePathFor(user)} className="btn-primary">
            Back to your workspace
          </Link>
        )}
        <form action={signOut}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </div>
    </div>
  );
}
