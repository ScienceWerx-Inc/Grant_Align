import 'server-only';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { prisma } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { canAccessOrg as canAccessOrgRule, homePathFor as homePathForRule, orgScope as orgScopeRule } from '@/lib/auth-rules';
import type { AppUser, OrgKind, Organization } from '@prisma/client';

/**
 * The authorization boundary for the whole application.
 *
 * Supabase answers "who is this?" and this module answers "what may they see?".
 * The split matters because Prisma connects as the database owner and so
 * bypasses row-level security completely: a Postgres RLS policy would have no
 * effect on any query this app makes. Every access decision therefore has to be
 * made here, in code, and every page and route handler must go through one of
 * these helpers rather than querying by an id straight from the URL.
 *
 * The rule the whole model reduces to: STAFF see everything; a SEEKER or DONOR
 * sees exactly one organization, the one their AppUser row points at.
 */

export type SessionUser = AppUser & { org: Organization | null };

/**
 * The signed-in user, or null.
 *
 * Wrapped in React's `cache` so the several calls a single page makes collapse
 * into one Supabase round trip and one database query per request.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  // getUser() revalidates the token with Supabase. getSession() reads it from a
  // cookie the client could have forged, so it must never gate authorization.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const appUser = await prisma.appUser.findUnique({
    where: { id: user.id },
    include: { org: true },
  });
  if (appUser) return appUser;

  // Signed in with Supabase but no profile row yet: the account exists and the
  // onboarding step has not run. Created here so a half-finished sign-up cannot
  // strand someone in a state with no row and no way to make one.
  return prisma.appUser.create({
    data: {
      id: user.id,
      email: user.email ?? `${user.id}@unknown.local`,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    },
    include: { org: true },
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
