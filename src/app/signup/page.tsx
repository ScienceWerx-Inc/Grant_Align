import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AuthShell';
import { SignUpForm } from '@/components/SignUpForm';
import { getSessionUser, homePathFor } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Create an account — Grant Align' };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user));

  return (
    <AuthShell
      eyebrow="Account"
      title="Create an account"
      intro="Next you'll set up your organization. The Grant Align team reviews new organizations before matching opens."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="btn-link">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm defaultRole={role === 'DONOR' ? 'DONOR' : 'SEEKER'} />
    </AuthShell>
  );
}
