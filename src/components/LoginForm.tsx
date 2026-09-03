'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Email and password sign-in.
 *
 * Sends people to /handoff rather than a fixed page: where someone belongs
 * depends on their role and organization, which only the server knows.
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

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    router.push(next ? `/handoff?next=${encodeURIComponent(next)}` : '/handoff');
    // The session lives in cookies the server has to re-read, so a refresh is
    // required for the new identity to take effect on server components.
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-white/60" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-white/60" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-glow/60 focus:ring-2 focus:ring-glow/20"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-skip-dark/30 bg-skip-dark/10 px-3 py-2 text-xs text-skip-dark">
          {error}
        </p>
      )}

      <button type="submit" disabled={busy} className="pill-light w-full">
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
