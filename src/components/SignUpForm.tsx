'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { completeSignUp } from '@/lib/auth-actions';
import { Alert, Button, FieldShell, RadioCard } from '@/components/ui';

/**
 * Account creation.
 *
 * Runs in the browser rather than as a server action so the new Firebase user
 * is signed in here: that is what lets us send the verification email now and
 * resend it from onboarding later. The ID token is then exchanged for the
 * `__session` cookie exactly as sign-in does, and the server records the name
 * and the side the person chose.
 */
export function SignUpForm({ defaultRole = 'SEEKER' }: { defaultRole?: 'SEEKER' | 'DONOR' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const role = String(form.get('role') ?? 'SEEKER');

    if (password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth(), email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // Best-effort: a failed send must not strand a created account, and
      // onboarding offers a resend.
      await sendEmailVerification(cred.user, { url: `${window.location.origin}/onboarding` }).catch(() => {});

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await cred.user.getIdToken() }),
      });
      if (!res.ok || res.redirected) throw new Error('Could not create a session. Try signing in.');
      await completeSignUp({ name, role });
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
      return;
    }

    router.push('/onboarding');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FieldShell label="Your name" htmlFor="name" required>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </FieldShell>
      <FieldShell label="Work email" htmlFor="email" required>
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
          <RadioCard
            name="role"
            value="SEEKER"
            label="A non-profit looking for grants"
            description="Build your profile once and see which funders fit."
            defaultChecked={defaultRole === 'SEEKER'}
          />
          <RadioCard
            name="role"
            value="DONOR"
            label="A funder who gives grants"
            description="Publish your criteria and see the non-profits that match them."
            defaultChecked={defaultRole === 'DONOR'}
          />
        </div>
      </fieldset>

      {error && <Alert tone="danger">{error}</Alert>}

      <Button type="submit" loading={busy} className="w-full">
        {busy ? 'Creating account…' : 'Create account'}
      </Button>
    </form>
  );
}

function friendlyMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code.includes('auth/email-already-in-use')) return 'An account with that email already exists. Try signing in.';
  if (code.includes('auth/invalid-email')) return 'That email address does not look right.';
  if (code.includes('auth/weak-password')) return 'Use a password of at least 8 characters.';
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Wait a moment and try again.';
  if (code.includes('auth/network-request-failed')) return 'Network error. Check your connection and try again.';
  if (code.includes('auth/operation-not-allowed')) return 'Sign-up is not enabled right now. Contact the Grant Align team.';
  return code && !code.startsWith('Firebase') ? code : 'The account could not be created. Try again.';
}
