import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { signIn } from '@/lib/auth-actions';
import { getSessionUser, homePathFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ 'check-email'?: string }>;
}) {
  const { 'check-email': checkEmail } = await searchParams;

  // Already signed in: bounce to the right workspace rather than showing a
  // login form that would appear to do nothing.
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user));

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Grant<span className="text-brand">Align</span>
      </Link>
      <h1 className="mt-8 text-xl font-semibold tracking-tight">Sign in</h1>

      {checkEmail && (
        <p className="mt-4 rounded-md bg-brand-light px-3 py-2 text-sm text-brand-dark">
          Check your email for a confirmation link, then sign in.
        </p>
      )}

      <div className="mt-6">
        <AuthForm action={signIn} submitLabel="Sign in" pendingLabel="Signing in…">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
        </AuthForm>
      </div>

      <p className="mt-6 text-sm text-muted">
        No account? <Link href="/signup" className="text-brand hover:underline">Create one</Link>
      </p>
    </div>
  );
}
