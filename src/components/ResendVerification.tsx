'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase';

/**
 * Resends the verification email, or re-checks after the link was clicked.
 *
 * Sending needs the Firebase user signed in in this browser, which it is after
 * sign-up or sign-in here. On another device it is not, and the honest answer
 * is to sign in again rather than fail silently.
 */
export function ResendVerification() {
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'signin' | 'error'>('idle');

  async function resend() {
    const user = firebaseAuth().currentUser;
    if (!user) {
      setStatus('signin');
      return;
    }
    setStatus('sending');
    try {
      await sendEmailVerification(user, { url: `${window.location.origin}/onboarding` });
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
      <button type="button" onClick={resend} disabled={status === 'sending'} className="btn-link">
        {status === 'sending' ? 'Sending…' : 'Resend the email'}
      </button>
      <button type="button" onClick={() => router.refresh()} className="btn-link">
        I&apos;ve verified it
      </button>
      {status === 'sent' && <span className="text-caption text-ink-muted">Sent. Check spam too.</span>}
      {status === 'signin' && (
        <span className="text-caption text-ink-muted">Sign out and back in on this device, then resend.</span>
      )}
      {status === 'error' && (
        <span className="text-caption text-ink-muted">Could not send right now. Wait a minute and retry.</span>
      )}
    </div>
  );
}
