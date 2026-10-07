'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';
import { Alert, Button, FieldShell } from '@/components/ui';

/**
 * Email and password sign-in.
 *
 * Signs in with Firebase Auth in the browser, exchanges the ID token for an
 * `__session` cookie via /api/auth/session, then goes to /handoff — where
 * someone belongs depends on their role and organization, which only the
 * server knows.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth(), email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error('Could not create a session. Try again.');
    } catch (err) {
      setError(friendlyMessage(err));
      setBusy(false);
      return;
    }

    router.push(next ? `/handoff?next=${encodeURIComponent(next)}` : '/handoff');
    // The session lives in cookies the server has to re-read, so a refresh is
    // required for the new identity to take effect on server components.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <FieldShell label="Email" htmlFor="email">
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
      <FieldShell label="Password" htmlFor="password">
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="input"
        />
      </FieldShell>

      {error && <Alert tone="danger">{error}</Alert>}

      <Button type="submit" loading={busy} className="w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}

function friendlyMessage(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/user-not-found') || code.includes('auth/wrong-password')) {
    // Deliberately not distinguishing "no such account" from "wrong password".
    return 'That email and password do not match an account.';
  }
  if (code.includes('auth/too-many-requests')) return 'Too many attempts. Wait a moment and try again.';
  if (code.includes('auth/network-request-failed')) return 'Network error. Check your connection and try again.';
  return 'Sign-in failed. Try again.';
}
