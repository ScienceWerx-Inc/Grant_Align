'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, homePathFor, requireStaff, requireUser } from '@/lib/auth';
import type { UserRole } from '@prisma/client';

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/** Signs in with email and password, then routes by role. */
export async function signIn(_prev: unknown, form: FormData): Promise<{ error: string } | void> {
  const email = field(form, 'email');
  const password = field(form, 'password');
  if (!email || !password) return { error: 'Email and password are both required.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Deliberately not distinguishing "no such account" from "wrong password":
    // the difference tells an attacker which emails are registered.
    return { error: 'That email and password do not match an account.' };
  }

  const user = await getSessionUser();
  redirect(user ? homePathFor(user) : '/dashboard');
}

/**
 * Creates an account.
 *
 * The role is taken from the form, which is safe only because SEEKER and DONOR
 * both grant access to nothing until staff link the account to an organization.
 * STAFF is deliberately absent from the options a form can submit - it is
 * granted by an existing staff member or by a direct database update, so that
 * self-registration can never mint an administrator.
 */
export async function signUp(_prev: unknown, form: FormData): Promise<{ error: string } | void> {
  const email = field(form, 'email');
  const password = field(form, 'password');
  const name = field(form, 'name');
  const requested = field(form, 'role');
  const role: UserRole = requested === 'DONOR' ? 'DONOR' : 'SEEKER';

  if (!email || !password) return { error: 'Email and password are both required.' };
  if (password.length < 8) return { error: 'Use a password of at least 8 characters.' };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'The account could not be created.' };

  await prisma.appUser.upsert({
    where: { id: data.user.id },
    create: { id: data.user.id, email, name: name || null, role },
    update: { email, name: name || null, role },
  });

  // With email confirmation enabled there is no session yet, so send them to
  // sign in rather than into a workspace they cannot load.
  if (!data.session) redirect('/login?check-email=1');
  redirect('/onboarding');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Claims membership of an organization during onboarding.
 *
 * This is a request, not a grant: it records which organization the person says
 * they belong to and gives them access to it. For a real deployment this needs
 * staff approval or domain verification - anyone could otherwise claim to work
 * at a foundation and read its private giving notes. Called out in the UI so
 * the gap is visible rather than assumed handled.
 */
export async function claimOrganization(form: FormData) {
  const user = await requireUser();
  const orgId = field(form, 'orgId');
  if (!orgId) return;

  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) return;

  // A seeker cannot claim a funder, or vice versa.
  const expected = user.role === 'DONOR' ? 'DONOR' : 'SEEKER';
  if (org.kind !== expected) return;

  await prisma.appUser.update({ where: { id: user.id }, data: { orgId } });
  revalidatePath('/', 'layout');
  redirect(user.role === 'SEEKER' ? `/seekers/${orgId}` : `/donors/${orgId}`);
}

/** Staff-only: change someone's role or organization. */
export async function updateMembership(userId: string, form: FormData) {
  await requireStaff();

  const role = field(form, 'role') as UserRole;
  const orgId = field(form, 'orgId');

  await prisma.appUser.update({
    where: { id: userId },
    data: {
      role: ['SEEKER', 'DONOR', 'STAFF'].includes(role) ? role : undefined,
      orgId: orgId === '' ? null : orgId,
    },
  });
  revalidatePath('/staff/people');
}
