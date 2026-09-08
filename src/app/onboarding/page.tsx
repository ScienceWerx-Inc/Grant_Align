import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { Overline } from '@/components/ui';

export const metadata = { title: 'Getting set up — Grant Align' };

/**
 * Landing spot for a signed-in user with no organization yet.
 *
 * Linking a person to an organization is deliberately a staff action rather
 * than self-service: on this platform, claiming to work at a foundation would
 * grant access to other non-profits' financials and match histories.
 */
export default async function OnboardingPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-band px-6 py-16">
      <div className="w-full max-w-lg rounded-card border border-line bg-card p-8 shadow-raised">
        <Overline>Getting set up</Overline>
        <h1 className="mt-3 text-h2 font-medium tracking-tight text-ink">
          Your account is not linked yet
        </h1>
        <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">
          You are signed in as <span className="font-medium text-ink">{user.email}</span> with the{' '}
          <span className="font-medium text-ink">{user.role.toLowerCase()}</span> role, but no
          organization has been assigned to it.
        </p>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          A platform administrator links accounts to organizations. That is not self-service on
          purpose: being able to claim you work at a foundation would mean access to other
          non-profits&apos; financials and match histories.
        </p>
        <div className="mt-6">
          <Link href="/" className="btn-secondary">Back to home</Link>
        </div>
      </div>
    </div>
  );
}
