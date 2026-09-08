import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { AuthShell } from '@/components/AuthShell';
import { FieldShell, RadioCard } from '@/components/ui';
import { signUp } from '@/lib/auth-actions';
import { getSessionUser, homePathFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user));

  return (
    <AuthShell
      eyebrow="Account"
      title="Create an account"
      intro="You will pick your organization next. Until then the account can see nothing."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="btn-link">
            Sign in
          </Link>
        </>
      }
    >
      <AuthForm action={signUp} submitLabel="Create account" pendingLabel="Creating…">
        <FieldShell label="Your name" htmlFor="name">
          <input id="name" name="name" autoComplete="name" className="input" />
        </FieldShell>
        <FieldShell label="Email" htmlFor="email" required>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </FieldShell>
        <FieldShell label="Password" htmlFor="password" hint="At least 8 characters." required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            className="input"
          />
        </FieldShell>
        <fieldset>
          <legend className="label">I am…</legend>
          <div className="space-y-2">
            {[
              ['SEEKER', 'A non-profit looking for grants'],
              ['DONOR', 'A funder who gives grants'],
            ].map(([value, label]) => (
              <RadioCard
                key={value}
                name="role"
                value={value}
                label={label}
                defaultChecked={value === 'SEEKER'}
              />
            ))}
          </div>
        </fieldset>
      </AuthForm>
    </AuthShell>
  );
}
