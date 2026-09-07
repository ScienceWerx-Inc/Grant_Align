import { LoginForm } from '@/components/LoginForm';
import { AuthShell } from '@/components/AuthShell';

export const metadata = { title: 'Sign in — Grant Align' };

/**
 * Signing in is the last step of the marketing surface, not the first step of
 * the tool. It now shares its frame with sign-up rather than running on a
 * separate dark system: the same flow should not change visual language
 * between two adjacent screens.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      eyebrow="Account"
      title="Sign in"
      intro="Grant seekers, funders and platform staff each see a different view of the same data."
      footer="Accounts are created by a platform administrator. Self-service would let anyone claim to work at a foundation."
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
