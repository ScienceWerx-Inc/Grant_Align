import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { signUp } from '@/lib/auth-actions';
import { getSessionUser, homePathFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user));

  return (
    <div className="mx-auto max-w-sm px-6 py-20">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        Grant<span className="text-brand">Align</span>
      </Link>
      <h1 className="mt-8 text-xl font-semibold tracking-tight">Create an account</h1>
      <p className="mt-2 text-sm text-muted">
        You will pick your organization next. Until then the account can see nothing.
      </p>

      <div className="mt-6">
        <AuthForm action={signUp} submitLabel="Create account" pendingLabel="Creating…">
          <div>
            <label className="label" htmlFor="name">Your name</label>
            <input id="name" name="name" autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="input"
            />
            <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
          </div>
          <fieldset>
            <legend className="label">I am…</legend>
            <div className="space-y-2">
              {[
                ['SEEKER', 'A non-profit looking for grants'],
                ['DONOR', 'A funder who gives grants'],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-line px-3 py-2.5 text-sm transition hover:bg-surface"
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    defaultChecked={value === 'SEEKER'}
                    className="border-line"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </AuthForm>
      </div>

      <p className="mt-6 text-sm text-muted">
        Already have an account? <Link href="/login" className="text-brand hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
