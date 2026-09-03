import Link from 'next/link';
import { getSessionUser, homePathFor } from '@/lib/auth';

export const metadata = { title: 'No access — Grant Align' };

/**
 * Shown when someone is signed in but not entitled to what they asked for.
 *
 * Deliberately says nothing about whether the thing exists: confirming that a
 * particular organization is on the platform is itself a disclosure, since the
 * ids are in URLs.
 */
export default async function NoAccessPage() {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight">You do not have access to that</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {user
            ? 'Your account can only see its own organization. If you think you should have wider access, ask a platform administrator.'
            : 'Sign in to continue.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={user ? homePathFor(user) : '/login'} className="btn-primary">
            {user ? 'Back to your workspace' : 'Sign in'}
          </Link>
          <Link href="/" className="btn-secondary">Home</Link>
        </div>
      </div>
    </div>
  );
}
