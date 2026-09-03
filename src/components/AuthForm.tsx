'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * Shared shell for sign-in and sign-up.
 *
 * `useActionState` keeps the error beside the form instead of throwing it into
 * an error boundary, and `useFormStatus` disables the button for the round trip
 * so a slow auth call cannot be double-submitted into two accounts.
 */

function SubmitButton({ label, pending }: { label: string; pending: string }) {
  const { pending: busy } = useFormStatus();
  return (
    <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
      {busy ? pending : label}
    </button>
  );
}

export function AuthForm({
  action,
  submitLabel,
  pendingLabel,
  children,
}: {
  action: (prev: unknown, form: FormData) => Promise<{ error: string } | void>;
  submitLabel: string;
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {children}
      {state?.error && (
        <p role="alert" className="rounded-md bg-skip/10 px-3 py-2 text-sm text-skip">
          {state.error}
        </p>
      )}
      <SubmitButton label={submitLabel} pending={pendingLabel} />
    </form>
  );
}
