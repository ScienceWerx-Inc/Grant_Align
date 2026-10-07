'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { adminAuth, createSessionCookie } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { webApiKey } from '@/lib/firebase';
import {
  createContact,
  createOrganization,
  getAppUser,
  getOrganization,
  listOrganizations,
  setOrganizationVerified,
  updateAppUser,
} from '@/lib/store';
import { canSelfOnboard } from '@/lib/auth-rules';
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
 * Finishes sign-up once the browser has created the Firebase account.
 *
 * The account itself is created client-side (src/components/SignUpForm.tsx) so
 * the browser holds a signed-in Firebase user and can send - and later resend -
 * the verification email; the server cannot do that without minting tokens.
 * By the time this runs the `__session` cookie is set, so this only records
 * the name and the chosen side.
 *
 * The role is taken from the form, which is safe because SEEKER and DONOR
 * grant access to nothing until the account has an organization, and an
 * account-created organization stays out of matching until staff verify it.
 * STAFF can never be chosen here.
 */
export async function completeSignUp(input: { name: string; role: string }): Promise<void> {
  const user = await requireUser();
  // Only for a fresh account: this must not let anyone re-pick a role later.
  if (!canSelfOnboard(user)) return;
  const name = input.name.trim().slice(0, 120);
  await updateAppUser(user.id, {
    name: name || null,
    role: input.role === 'DONOR' ? 'DONOR' : 'SEEKER',
  });
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

// ---------------------------------------------------------------------------
// Onboarding: an account with no organization sets one up, or asks to join one
// ---------------------------------------------------------------------------

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function optionalUrl(value: string): string | null {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/** Switches between seeker and funder before an organization exists. */
export async function setOnboardingRole(form: FormData) {
  const user = await requireUser();
  if (!canSelfOnboard(user)) redirect(homePathFor(user));
  await updateAppUser(user.id, {
    role: field(form, 'role') === 'DONOR' ? 'DONOR' : 'SEEKER',
    // A pending request was for an organization of the other kind.
    requestedOrgId: null,
  });
  revalidatePath('/onboarding');
}

/**
 * Creates the signed-in user's own organization and makes them its member.
 *
 * Creating a NEW organization exposes nobody else's data, which is why this can
 * be self-service when claiming an existing one cannot. It starts unverified:
 * the owner can fill in the profile and run the interview straight away, but it
 * is not paired with anyone until staff review it.
 */
export async function createOwnOrganization(_prev: unknown, form: FormData): Promise<{ error: string } | void> {
  const user = await requireUser();
  if (!canSelfOnboard(user)) redirect(homePathFor(user));

  const kind = user.role === 'DONOR' ? 'DONOR' : 'SEEKER';
  const name = field(form, 'name').slice(0, 160);
  if (!name) return { error: 'Enter your organization\'s name.' };

  // Someone else registering a real organization's name first would squat it,
  // so an existing match is sent to the join flow instead.
  const existing = (await listOrganizations(kind)).find(o => normalizeName(o.name) === normalizeName(name));
  if (existing) {
    return { error: `${existing.name} is already on Grant Align. Use "Join an existing organization" below to ask for access.` };
  }

  const org = await createOrganization({
    kind,
    name,
    ein: field(form, 'ein') || null,
    website: optionalUrl(field(form, 'website')),
    mission: field(form, 'mission') || null,
    city: field(form, 'city') || null,
    state: field(form, 'state') || null,
    verified: false,
    createdBy: user.id,
  });
  await createContact({
    orgId: org.id,
    name: user.name || user.email,
    title: field(form, 'title') || null,
    email: user.email,
    phone: null,
    isPrimary: true,
  });
  await updateAppUser(user.id, { orgId: org.id, requestedOrgId: null });

  revalidatePath('/', 'layout');
  redirect(kind === 'SEEKER' ? `/seekers/${org.id}` : `/donors/${org.id}`);
}

/**
 * Asks to join an organization that already exists.
 *
 * A request, never a grant: joining an existing organization means reading its
 * financials and match history, so staff approve it on the People page.
 */
export async function requestToJoin(form: FormData) {
  const user = await requireUser();
  if (!canSelfOnboard(user)) redirect(homePathFor(user));

  const org = await getOrganization(field(form, 'orgId'));
  // A seeker cannot ask to join a funder, or vice versa.
  if (!org || org.kind !== (user.role === 'DONOR' ? 'DONOR' : 'SEEKER')) return;

  await updateAppUser(user.id, { requestedOrgId: org.id });
  revalidatePath('/onboarding');
}

export async function cancelJoinRequest() {
  const user = await requireUser();
  await updateAppUser(user.id, { requestedOrgId: null });
  revalidatePath('/onboarding');
}

// ---------------------------------------------------------------------------
// Staff review
// ---------------------------------------------------------------------------

export async function approveJoinRequest(userId: string) {
  await requireStaff();
  const target = await getAppUser(userId);
  if (!target?.requestedOrgId) return;
  const org = await getOrganization(target.requestedOrgId);
  if (!org) return;
  await updateAppUser(userId, {
    orgId: org.id,
    role: org.kind,
    requestedOrgId: null,
  });
  revalidatePath('/staff/people');
}

export async function declineJoinRequest(userId: string) {
  await requireStaff();
  await updateAppUser(userId, { requestedOrgId: null });
  revalidatePath('/staff/people');
}

/** Lets a self-registered organization into matching. */
export async function verifyOrganization(orgId: string) {
  await requireStaff();
  await setOrganizationVerified(orgId, true);
  revalidatePath('/staff/people');
  revalidatePath(`/seekers/${orgId}`);
  revalidatePath(`/donors/${orgId}`);
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
