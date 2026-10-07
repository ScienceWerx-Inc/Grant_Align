import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME } from '@/lib/session';
import { verifySessionCookie } from '@/lib/firebase-admin';
import { adminAuth } from '@/lib/firebase-admin';
import { createAppUser, getAppUser } from '@/lib/store';
import { canAccessOrg as canAccessOrgRule, homePathFor as homePathForRule, orgScope as orgScopeRule } from '@/lib/auth-rules';
import type { AppUser, Organization, OrgKind } from '@/lib/types';

/**
 * The authorization boundary for the whole application.
 *
 * Firebase Auth answers "who is this?" (via the `__session` cookie, minted
 * from a Firebase ID token) and this module answers "what may they see?".
 * Firestore has deny-by-default rules and every access decision is made here,
 * in code. Every page and route handler must go through one of these helpers
 * rather than querying by an id straight from the URL.
 *
 * The rule the whole model reduces to: STAFF see everything; a SEEKER or DONOR
 * sees exactly one organization, the one their user row points at.
 */

export type SessionUser = AppUser & { org: Organization | null };

/**
 * The signed-in user, or null.
 *
 * Wrapped in React's `cache` so the several calls a single page makes collapse
 * into one Auth verification and one Firestore read per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  let uid: string;
  let email: string | undefined;
  try {
    const verified = await verifySessionCookie(session);
    uid = verified.uid;
    email = verified.email;
  } catch {
    // Expired, revoked or forged cookie: treat as signed out.
    return null;
  }

  const appUser = await getAppUser(uid);
  if (appUser) return appUser;

  // Signed in with Firebase but no profile row yet: the account exists and the
  // onboarding step has not run. Created here so a half-finished sign-up cannot
  // strand someone in a state with no row and no way to make one.
  if (!email) {
    try {
      const record = await adminAuth().getUser(uid);
      email = record.email;
    } catch {
      email = undefined;
    }
  }
  return createAppUser({
    id: uid,
    email: email ?? `${uid}@unknown.local`,
  });
});

/** Requires a signed-in user, sending anyone else to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return user;
}

/** Requires a staff account. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'STAFF') redirect('/no-access');
  return user;
}

/** True when this user may read and edit the given organization. */
export function canAccessOrg(user: SessionUser, orgId: string): boolean {
  return canAccessOrgRule(user, orgId);
}

/**
 * Requires access to one organization.
 *
 * Takes the id from the caller and checks it against the session rather than
 * trusting the URL, which is the single most likely place for this application
 * to leak one non-profit's financials to another.
 */
export async function requireOrgAccess(orgId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessOrg(user, orgId)) redirect('/no-access');
  return user;
}

/**
 * The organization filter for list pages.
 *
 * Staff see every organization of a kind; everyone else sees only their own,
 * and a user with no organization yet sees nothing rather than everything -
 * the failure mode that matters is a filter that silently widens.
 */
export function orgScope(user: SessionUser, kind: OrgKind) {
  return orgScopeRule(user, kind);
}

/** Where a user lands after signing in, by role. */
export function homePathFor(user: SessionUser): string {
  return homePathForRule(user);
}
