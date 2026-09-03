/**
 * Tests for the authorization rules.
 *
 * A mistake in any of these is a data leak - one non-profit reading another's
 * finances, or a funder seeing its peers' evaluations - and none of it would
 * throw or look wrong on screen. The cases marked CRITICAL are the ones where
 * a plausible implementation fails open.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canAccessOrg, canRunFullMatching, homePathFor, orgScope } from '../src/lib/auth-rules';

const staff = { role: 'STAFF' as const, orgId: null };
const seeker = { role: 'SEEKER' as const, orgId: 'org-kitchen' };
const donor = { role: 'DONOR' as const, orgId: 'org-delaplaine' };
const orphan = { role: 'SEEKER' as const, orgId: null };

test('staff can access any organization', () => {
  assert.equal(canAccessOrg(staff, 'org-kitchen'), true);
  assert.equal(canAccessOrg(staff, 'org-delaplaine'), true);
});

test('a seeker can access only its own organization', () => {
  assert.equal(canAccessOrg(seeker, 'org-kitchen'), true);
  assert.equal(canAccessOrg(seeker, 'org-delaplaine'), false);
  assert.equal(canAccessOrg(seeker, 'org-youth-arts'), false);
});

test('a donor can access only its own organization', () => {
  assert.equal(canAccessOrg(donor, 'org-delaplaine'), true);
  assert.equal(canAccessOrg(donor, 'org-kitchen'), false);
});

test('CRITICAL: a user with no organization can access nothing', () => {
  // `user.orgId === orgId` alone is not enough here - the check has to reject
  // an unset orgId explicitly, or a record with a null orgId would match.
  assert.equal(canAccessOrg(orphan, 'org-kitchen'), false);
  assert.equal(canAccessOrg(orphan, ''), false);
});

test('CRITICAL: the list filter narrows rather than widening', () => {
  // Staff get an unrestricted filter; everyone else must be pinned to one id.
  assert.deepEqual(orgScope(staff, 'SEEKER'), { kind: 'SEEKER' });
  assert.deepEqual(orgScope(seeker, 'SEEKER'), { kind: 'SEEKER', id: 'org-kitchen' });

  // An orphaned account must get a filter matching nothing. An empty filter
  // here would return every organization in the system.
  const scope = orgScope(orphan, 'SEEKER');
  assert.equal(scope.id, '__none__');
  assert.notEqual(scope.id, undefined);
});

test('sign-in routes each role to somewhere it can actually load', () => {
  assert.equal(homePathFor(staff), '/dashboard');
  assert.equal(homePathFor(seeker), '/seekers/org-kitchen');
  assert.equal(homePathFor(donor), '/donors/org-delaplaine');
  // Not /dashboard, which would immediately bounce to /no-access.
  assert.equal(homePathFor(orphan), '/onboarding');
});

test('only staff may run the engine over every pair', () => {
  assert.equal(canRunFullMatching(staff), true);
  assert.equal(canRunFullMatching(seeker), false);
  assert.equal(canRunFullMatching(donor), false);
});
