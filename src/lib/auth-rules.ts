/**
 * The authorization rules, as pure functions.
 *
 * Separated from src/lib/auth.ts because that module is `server-only` and
 * reaches for cookies and the database, which makes the actual decisions
 * untestable. These are the decisions; everything there is plumbing that calls
 * into them. A mistake in one of these functions is a data leak, so they are
 * the part that most needs tests.
 */

import type { OrgKind, UserRole } from '@prisma/client';

export interface Principal {
  role: UserRole;
  orgId: string | null;
}

/** True when this principal may read and edit the given organization. */
export function canAccessOrg(user: Principal, orgId: string): boolean {
  if (user.role === 'STAFF') return true;
  // Guards against the case that matters most: a principal with no
  // organization must match nothing, not everything. `null === null` would
  // otherwise grant access to any record whose orgId is also null.
  if (!user.orgId) return false;
  return user.orgId === orgId;
}

/**
 * The organization filter for list pages.
 *
 * The sentinel id for a principal with no organization is deliberate: an empty
 * filter object would return every row, so the failure mode of a missing orgId
 * has to be "nothing" rather than "everything".
 */
export function orgScope(user: Principal, kind: OrgKind): { kind: OrgKind; id?: string } {
  if (user.role === 'STAFF') return { kind };
  return { kind, id: user.orgId ?? '__none__' };
}

/** Where a principal lands after signing in. */
export function homePathFor(user: Principal): string {
  if (user.role === 'STAFF') return '/dashboard';
  if (!user.orgId) return '/onboarding';
  return user.role === 'SEEKER' ? `/seekers/${user.orgId}` : `/donors/${user.orgId}`;
}

/** Whether a role may run the engine over every pair, not just its own. */
export function canRunFullMatching(user: Principal): boolean {
  return user.role === 'STAFF';
}
