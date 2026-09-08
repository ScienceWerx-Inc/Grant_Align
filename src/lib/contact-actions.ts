'use server';

/**
 * The public contact form's server action.
 *
 * Kept out of lib/actions.ts because everything in that file runs behind
 * requireStaff or requireOrgAccess. This one is deliberately unauthenticated,
 * and that difference is worth being able to see at a glance.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

export interface ContactState {
  error?: string;
  sent?: boolean;
}

/** Deliberately loose: this only has to reject obvious nonsense, not police addresses. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export async function submitContact(_prev: unknown, form: FormData): Promise<ContactState> {
  const name = field(form, 'name');
  const email = field(form, 'email');
  const organization = field(form, 'organization');
  const message = field(form, 'message');

  // A hidden field a person never sees and never fills in. An unauthenticated
  // endpoint on a public page will be found by bots; this stops the laziest of
  // them without putting a puzzle in front of a real person.
  if (field(form, 'website')) return { sent: true };

  if (!name) return { error: 'Please tell us your name.' };
  if (!EMAIL.test(email)) return { error: 'Please enter an email address we can reply to.' };
  if (message.length < 10) return { error: 'Please add a little more detail to your message.' };
  if (message.length > 4000) return { error: 'That message is too long. Please keep it under 4000 characters.' };

  try {
    await prisma.contactMessage.create({
      data: { name, email, organization: organization || null, message },
    });
  } catch {
    // Never surface the database error itself: it can carry connection details.
    return { error: 'We could not save that just now. Please try again in a moment.' };
  }

  revalidatePath('/staff/messages');
  return { sent: true };
}

/** Marks an enquiry dealt with. Staff only - the page itself enforces that. */
export async function markContactHandled(id: string) {
  await prisma.contactMessage.update({
    where: { id },
    data: { handledAt: new Date() },
  });
  revalidatePath('/staff/messages');
}
