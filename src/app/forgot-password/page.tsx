import Link from 'next/link';
import { AuthShell } from '@/components/AuthShell';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';

export const metadata = { title: 'Reset your password — Grant Align' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account"
      title="Reset your password"
      intro="Enter the email you signed up with and we'll send you a link to choose a new password."
      footer={
        <>
          Remembered it?{' '}
          <Link href="/login" className="btn-link">
            Back to sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
