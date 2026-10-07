'use server';

/**
 * Server actions behind the CRM forms. Kept in one file because they are all
 * the same shape — validate, write, revalidate — and splitting them per entity
 * would spread six-line functions across six files.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  clearPrimaryContacts,
  createContact as storeCreateContact,
  createDefaultCompliance,
  createOrganization as storeCreateOrganization,
  deleteContact as storeDeleteContact,
  deleteOrganizationCascade,
  getComplianceItemOrThrow,
  getContactOrThrow,
  getResearchRunOrThrow,
  updateComplianceItem as storeUpdateCompliance,
  updateOrganization as storeUpdateOrganization,
  upsertComplianceItem as storeUpsertCompliance,
  upsertDonorProfile,
  upsertSeekerProfile,
} from '@/lib/store';
import { acceptResearchRun } from '@/lib/donor-refresh';
import { requireOrgAccess, requireStaff, requireUser } from '@/lib/auth';
import type { ComplianceStatus, ComplianceType, OrgKind } from '@/lib/types';

function str(form: FormData, key: string): string | null {
  const value = form.get(key);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function num(form: FormData, key: string): number | null {
  const value = str(form, key);
  if (value === null) return null;
  const parsed = Number(value.replace(/[$,]/g, ''));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

/** Comma-separated inputs are the fastest way to edit the tag arrays by hand. */
function list(form: FormData, key: string): string[] {
  const value = str(form, key);
  if (!value) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Authorization for mutations.
 *
 * A server action is a public HTTP endpoint. Every one of these takes an orgId
 * from a form field, and without a check any signed-in user could post another
 * organization's id and edit its profile - the page guard that rendered the
 * form is irrelevant by then. `requireOrgAccess` redirects rather than throws,
 * so a rejected action never silently succeeds.
 */

export async function createOrganization(kind: OrgKind, form: FormData) {
  // Creating organizations is a staff act; membership is granted, not claimed.
  await requireStaff();

  const name = str(form, 'name');
  if (!name) throw new Error('An organization name is required.');

  const org = await storeCreateOrganization({
    kind,
    name,
    ein: str(form, 'ein'),
    website: str(form, 'website'),
    mission: str(form, 'mission'),
    addressLine: str(form, 'addressLine'),
    city: str(form, 'city'),
    state: str(form, 'state'),
    postalCode: str(form, 'postalCode'),
    phone: str(form, 'phone'),
    notes: str(form, 'notes'),
  });

  if (kind === 'SEEKER') {
    // createOrganization already seeds the profile + default checklist via
    // the store; this is a no-op safeguard for orgs created before the seed.
    await createDefaultCompliance(org.id);
  }

  const base = kind === 'SEEKER' ? '/seekers' : '/donors';
  revalidatePath(base);
  redirect(`${base}/${org.id}`);
}

export async function createSeeker(form: FormData) {
  return createOrganization('SEEKER', form);
}

export async function createDonor(form: FormData) {
  return createOrganization('DONOR', form);
}

export async function updateOrganization(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const org = await storeUpdateOrganization(orgId, {
    name: str(form, 'name') ?? undefined,
    ein: str(form, 'ein'),
    website: str(form, 'website'),
    mission: str(form, 'mission'),
    addressLine: str(form, 'addressLine'),
    city: str(form, 'city'),
    state: str(form, 'state'),
    postalCode: str(form, 'postalCode'),
    phone: str(form, 'phone'),
    notes: str(form, 'notes'),
  });
  revalidatePath(`/${org.kind === 'SEEKER' ? 'seekers' : 'donors'}/${orgId}`);
}

export async function upsertContact(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const name = str(form, 'contactName');
  if (!name) throw new Error('A contact name is required.');
  const isPrimary = form.get('isPrimary') === 'on';

  if (isPrimary) {
    await clearPrimaryContacts(orgId);
  }
  await storeCreateContact({
    orgId,
    name,
    title: str(form, 'contactTitle'),
    email: str(form, 'contactEmail'),
    phone: str(form, 'contactPhone'),
    isPrimary,
  });
  revalidatePath(`/seekers/${orgId}`);
  revalidatePath(`/donors/${orgId}`);
}

export async function deleteContact(contactId: string) {
  // Keyed on the contact, not the organization, so the owner has to be looked
  // up before the delete rather than after it.
  const existing = await getContactOrThrow(contactId);
  await requireOrgAccess(existing.orgId);

  const contact = await storeDeleteContact(contactId);
  revalidatePath(`/seekers/${contact.orgId}`);
  revalidatePath(`/donors/${contact.orgId}`);
}

export async function updateSeekerProfile(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  await upsertSeekerProfile(orgId, {
    servesWho: str(form, 'servesWho'),
    doesWhat: str(form, 'doesWhat'),
    doesNotDo: str(form, 'doesNotDo'),
    doesNotServe: str(form, 'doesNotServe'),
    populations: list(form, 'populations'),
    serviceAreas: list(form, 'serviceAreas'),
    programAreas: list(form, 'programAreas'),
    outcomes: str(form, 'outcomes'),
    yearFounded: num(form, 'yearFounded'),
    annualBudget: num(form, 'annualBudget'),
    staffCount: num(form, 'staffCount'),
    volunteerCount: num(form, 'volunteerCount'),
  });
  revalidatePath(`/seekers/${orgId}`);
}

export async function updateDonorProfile(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const deadline = str(form, 'nextDeadline');
  await upsertDonorProfile(orgId, {
    fundingFocus: list(form, 'fundingFocus'),
    excludedSectors: list(form, 'excludedSectors'),
    populationsServed: list(form, 'populationsServed'),
    geographies: list(form, 'geographies'),
    grantMin: num(form, 'grantMin'),
    grantMax: num(form, 'grantMax'),
    cycleNotes: str(form, 'cycleNotes'),
    nextDeadline: deadline ? new Date(deadline) : null,
    applicationPortal: str(form, 'applicationPortal'),
    applicationUrl: str(form, 'applicationUrl'),
    requiresLoi: form.get('requiresLoi') === 'on',
    requires990: form.get('requires990') === 'on',
    requiresGoodStanding: form.get('requiresGoodStanding') === 'on',
    givingNotes: str(form, 'givingNotes'),
  });
  revalidatePath(`/donors/${orgId}`);
}

export async function updateCompliance(itemId: string, form: FormData) {
  const existing = await getComplianceItemOrThrow(itemId);
  await requireOrgAccess(existing.orgId);

  const item = await storeUpdateCompliance(itemId, {
    status: (str(form, 'status') ?? 'MISSING') as ComplianceStatus,
    periodLabel: str(form, 'periodLabel'),
    documentUrl: str(form, 'documentUrl'),
    notes: str(form, 'notes'),
  });
  revalidatePath(`/seekers/${item.orgId}`);
}

export async function addComplianceItem(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const type = str(form, 'type') as ComplianceType | null;
  if (!type) throw new Error('A document type is required.');
  await storeUpsertCompliance(orgId, type, {});
  revalidatePath(`/seekers/${orgId}`);
}

/** Accepts a research run's proposed criteria into the live donor profile. */
export async function acceptResearch(runId: string) {
  const run = await getResearchRunOrThrow(runId);
  await requireOrgAccess(run.orgId);

  const orgId = await acceptResearchRun(runId);
  revalidatePath(`/donors/${orgId}`);
}

/** Writes interviewer-extracted fields onto the profile, without clobbering. */
export async function applyInterviewExtraction(
  orgId: string,
  role: 'SEEKER' | 'DONOR',
  extracted: Record<string, unknown>,
  complete: boolean,
) {
  // Its only caller already authorized this org, but it is an exported server
  // action and therefore its own endpoint. Guarded so it cannot be reused
  // without one.
  await requireOrgAccess(orgId);

  const clean = Object.fromEntries(
    Object.entries(extracted).filter(([, v]) => {
      if (v === null || v === undefined || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    }),
  );
  if (Object.keys(clean).length === 0 && !complete) return;

  if (role === 'SEEKER') {
    await upsertSeekerProfile(orgId, { ...clean, ...(complete ? { interviewComplete: true } : {}) });
    revalidatePath(`/seekers/${orgId}`);
  } else {
    await upsertDonorProfile(orgId, clean);
    revalidatePath(`/donors/${orgId}`);
  }
}

export async function deleteOrganization(orgId: string) {
  // Deleting an organization cascades to its matches, research history and
  // members, so it stays with staff even for one's own organization.
  await requireStaff();

  const org = await deleteOrganizationCascade(orgId);
  const base = org.kind === 'SEEKER' ? '/seekers' : '/donors';
  revalidatePath(base);
  redirect(base);
}
