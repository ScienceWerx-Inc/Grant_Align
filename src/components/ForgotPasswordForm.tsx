'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { Alert, Button, FieldShell } from '@/components/ui';

/**
 * Sends Firebase's password-reset email. The link opens Firebase's hosted reset
 * page, which returns the person to /login when they are done.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await sendPasswordResetEmail(firebaseAuth(), email.trim(), { url: `${window.location.origin}/login` });
      setSent(true);
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code.includes('auth/user-not-found')) {
        // Same answer as success: whether an email is registered is not ours to reveal.
        setSent(true);
      } else if (code.includes('auth/invalid-email')) {
        setError('That email address does not look right.');
      } else if (code.includes('auth/too-many-requests')) {
        setError('Too many attempts. Wait a moment and try again.');
      } else {
        setError('The reset email could not be sent. Try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <Alert tone="success" title="Check your inbox">
        If an account exists for {email}, a link to choose a new password is on its way. It can take a
        minute, and may land in spam.
      </Alert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FieldShell label="Email" htmlFor="email" required>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="input"
        />
      </FieldShell>
      {error && <Alert tone="danger">{error}</Alert>}
      <Button type="submit" loading={busy} className="w-full">
        {busy ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  );
}
