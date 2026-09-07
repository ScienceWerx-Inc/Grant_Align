'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Alert, Button } from '@/components/ui';

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
    <Button type="submit" loading={busy} className="w-full">
      {busy ? pending : label}
    </Button>
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
    <form action={formAction} className="space-y-5">
      {children}
      {state?.error && <Alert tone="danger">{state.error}</Alert>}
      <SubmitButton label={submitLabel} pending={pendingLabel} />
    </form>
  );
}
