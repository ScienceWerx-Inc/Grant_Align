'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth, createSessionCookie } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { webApiKey } from '@/lib/firebase';
import { getOrganization, updateAppUser, upsertAppUser } from '@/lib/store';
import { getSessionUser, homePathFor, requireStaff, requireUser } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

function field(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Email/password auth against Firebase Auth via the Identity Toolkit REST API,
 * then a Firebase session cookie (`__session`) for subsequent requests.
 *
 * Server actions cannot use the Firebase client SDK's persistent auth state,
 * so they exchange credentials for an ID token over REST and mint a session
 * cookie with the Admin SDK — the same flow the client-side session endpoint
 * uses.
 */

const SIGN_IN_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
const SIGN_UP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp';

async function toolkit(url: string, body: Record<string, unknown>) {
  const res = await fetch(`${url}?key=${webApiKey()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, returnSecureToken: true }),
  });
  const json = (await res.json()) as { idToken?: string; localId?: string; message?: string; error?: { message?: string } };
  if (!res.ok || !json.idToken || !json.localId) {
    throw new Error(normalizeToolkitError(json.error?.message ?? json.message));
  }
  return json as { idToken: string; localId: string };
}

/** Map Identity Toolkit error codes to a message safe to show in the form. */
function normalizeToolkitError(code: string | undefined): string {
  if (!code) return 'Sign-in failed. Try again.';
  if (code.includes('EMAIL_NOT_FOUND') || code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
    // Deliberately not distinguishing "no such account" from "wrong password":
    // the difference tells an attacker which emails are registered.
    return 'That email and password do not match an account.';
  }
  if (code.includes('EMAIL_EXISTS')) return 'An account with that email already exists. Try signing in.';
  if (code.includes('WEAK_PASSWORD')) return 'Use a password of at least 8 characters.';
  if (code.includes('TOO_MANY_ATTEMPTS')) return 'Too many attempts. Wait a moment and try again.';
  return 'Authentication failed. Try again.';
}

async function setSessionCookie(idToken: string) {
  const cookie = await createSessionCookie(idToken);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 24 * 60 * 60,
  });
}

/** Signs in with email and password, then routes by role. */
export async function signIn(_prev: unknown, form: FormData): Promise<{ error: string } | void> {
  const email = field(form, 'email');
  const password = field(form, 'password');
  if (!email || !password) return { error: 'Email and password are both required.' };

  try {
    const { idToken } = await toolkit(SIGN_IN_URL, { email, password });
    await setSessionCookie(idToken);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign-in failed. Try again.' };
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
 * granted by an existing staff member or by a direct Firestore update, so that
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

  try {
    const { idToken, localId } = await toolkit(SIGN_UP_URL, { email, password });
    await adminAuth().updateUser(localId, { displayName: name || undefined });
    await upsertAppUser({ id: localId, email, name: name || null, role });
    await setSessionCookie(idToken);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'The account could not be created.' };
  }

  redirect('/onboarding');
}

export async function signOut() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;
  store.delete(SESSION_COOKIE_NAME);
  if (session) {
    try {
      const { uid } = await import('@/lib/firebase-admin').then(m =>
        m.verifySessionCookie(session).then(
          v => v,
          () => ({ uid: null as string | null }),
        ),
      );
      if (uid) await adminAuth().revokeRefreshTokens(uid);
    } catch {
      // Cookie was already invalid; nothing to revoke.
    }
  }
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

  const org = await getOrganization(orgId);
  if (!org) return;

  // A seeker cannot claim a funder, or vice versa.
  const expected = user.role === 'DONOR' ? 'DONOR' : 'SEEKER';
  if (org.kind !== expected) return;

  await updateAppUser(user.id, { orgId });
  revalidatePath('/', 'layout');
  redirect(user.role === 'SEEKER' ? `/seekers/${orgId}` : `/donors/${orgId}`);
}

/** Staff-only: change someone's role or organization. */
export async function updateMembership(userId: string, form: FormData) {
  await requireStaff();

  const role = field(form, 'role') as UserRole;
  const orgId = field(form, 'orgId');

  await updateAppUser(userId, {
    role: ['SEEKER', 'DONOR', 'STAFF'].includes(role) ? role : undefined,
    orgId: orgId === '' ? null : orgId,
  });
  revalidatePath('/staff/people');
}
