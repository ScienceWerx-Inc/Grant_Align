'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitContact, type ContactState } from '@/lib/contact-actions';
import { Alert, Button, FieldShell } from '@/components/ui';
import { IconApply } from '@/components/icons';

/**
 * The contact form.
 *
 * Same shape as AuthForm: useActionState keeps the error next to the fields
 * rather than throwing it into an error boundary, and useFormStatus disables
 * submit for the round trip so a slow write cannot be sent twice.
 */

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} className="w-full">
      {pending ? 'Sending…' : 'Send message'}
    </Button>
  );
}

export function ContactForm() {
  const [state, formAction] = useActionState<ContactState, FormData>(submitContact, {});

  if (state.sent) {
    return (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-success-tint text-success">
          <IconApply className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-h3 font-medium text-ink">Message sent</h2>
        <p className="mx-auto mt-2 max-w-sm text-body-sm text-ink-muted">
          Thank you. We have your message and will reply to the address you gave us.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <FieldShell label="Your name" htmlFor="name" required>
        <input id="name" name="name" autoComplete="name" required className="input" />
      </FieldShell>

      <FieldShell label="Email" htmlFor="email" hint="So we can reply." required>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </FieldShell>

      <FieldShell label="Organization" htmlFor="organization" hint="Optional.">
        <input id="organization" name="organization" autoComplete="organization" className="input" />
      </FieldShell>

      <FieldShell label="Message" htmlFor="message" required>
        <textarea id="message" name="message" rows={6} required minLength={10} maxLength={4000} className="input" />
      </FieldShell>

      {/*
       * Honeypot. Hidden from sight and from assistive technology, and taken
       * out of the tab order, so only an automated submitter fills it in.
       */}
      <div className="hidden" aria-hidden>
        <label htmlFor="website">Leave this field empty</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {state.error && <Alert tone="danger">{state.error}</Alert>}

      <SubmitButton />
    </form>
  );
}
