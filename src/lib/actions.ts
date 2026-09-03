'use server';

/**
 * Server actions behind the CRM forms. Kept in one file because they are all
 * the same shape — validate, write, revalidate — and splitting them per entity
 * would spread six-line functions across six files.
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { acceptResearchRun } from '@/lib/donor-refresh';
import { requireOrgAccess, requireStaff, requireUser } from '@/lib/auth';
import type { ComplianceStatus, ComplianceType, OrgKind } from '@prisma/client';

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

  const org = await prisma.organization.create({
    data: {
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
      ...(kind === 'SEEKER'
        ? { seekerProfile: { create: {} } }
        : { donorProfile: { create: {} } }),
    },
  });

  if (kind === 'SEEKER') {
    // Every local funder asks for these three, so the checklist starts populated
    // as MISSING rather than empty — an empty list reads as "nothing required".
    await prisma.complianceItem.createMany({
      data: (['FORM_990', 'GOOD_STANDING', 'IRS_DETERMINATION'] as ComplianceType[]).map(type => ({
        orgId: org.id,
        type,
      })),
    });
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

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
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
    },
  });
  revalidatePath(`/${org.kind === 'SEEKER' ? 'seekers' : 'donors'}/${orgId}`);
}

export async function upsertContact(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const name = str(form, 'contactName');
  if (!name) throw new Error('A contact name is required.');
  const isPrimary = form.get('isPrimary') === 'on';

  if (isPrimary) {
    await prisma.contact.updateMany({ where: { orgId }, data: { isPrimary: false } });
  }
  await prisma.contact.create({
    data: {
      orgId,
      name,
      title: str(form, 'contactTitle'),
      email: str(form, 'contactEmail'),
      phone: str(form, 'contactPhone'),
      isPrimary,
    },
  });
  revalidatePath(`/seekers/${orgId}`);
  revalidatePath(`/donors/${orgId}`);
}

export async function deleteContact(contactId: string) {
  // Keyed on the contact, not the organization, so the owner has to be looked
  // up before the delete rather than after it.
  const existing = await prisma.contact.findUniqueOrThrow({
    where: { id: contactId },
    select: { orgId: true },
  });
  await requireOrgAccess(existing.orgId);

  const contact = await prisma.contact.delete({ where: { id: contactId } });
  revalidatePath(`/seekers/${contact.orgId}`);
  revalidatePath(`/donors/${contact.orgId}`);
}

export async function updateSeekerProfile(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const data = {
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
  };
  await prisma.seekerProfile.upsert({
    where: { orgId },
    create: { orgId, ...data },
    update: data,
  });
  revalidatePath(`/seekers/${orgId}`);
}

export async function updateDonorProfile(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const deadline = str(form, 'nextDeadline');
  const data = {
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
  };
  await prisma.donorProfile.upsert({
    where: { orgId },
    create: { orgId, ...data },
    update: data,
  });
  revalidatePath(`/donors/${orgId}`);
}

export async function updateCompliance(itemId: string, form: FormData) {
  const existing = await prisma.complianceItem.findUniqueOrThrow({
    where: { id: itemId },
    select: { orgId: true },
  });
  await requireOrgAccess(existing.orgId);

  const item = await prisma.complianceItem.update({
    where: { id: itemId },
    data: {
      status: (str(form, 'status') ?? 'MISSING') as ComplianceStatus,
      periodLabel: str(form, 'periodLabel'),
      documentUrl: str(form, 'documentUrl'),
      notes: str(form, 'notes'),
    },
  });
  revalidatePath(`/seekers/${item.orgId}`);
}

export async function addComplianceItem(orgId: string, form: FormData) {
  await requireOrgAccess(orgId);

  const type = str(form, 'type') as ComplianceType | null;
  if (!type) throw new Error('A document type is required.');
  await prisma.complianceItem.upsert({
    where: { orgId_type: { orgId, type } },
    create: { orgId, type },
    update: {},
  });
  revalidatePath(`/seekers/${orgId}`);
}

/** Accepts a research run's proposed criteria into the live donor profile. */
export async function acceptResearch(runId: string) {
  const run = await prisma.researchRun.findUniqueOrThrow({
    where: { id: runId },
    select: { orgId: true },
  });
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
    await prisma.seekerProfile.upsert({
      where: { orgId },
      create: { orgId, ...clean, interviewComplete: complete },
      update: { ...clean, ...(complete ? { interviewComplete: true } : {}) },
    });
    revalidatePath(`/seekers/${orgId}`);
  } else {
    await prisma.donorProfile.upsert({
      where: { orgId },
      create: { orgId, ...clean },
      update: clean,
    });
    revalidatePath(`/donors/${orgId}`);
  }
}

export async function deleteOrganization(orgId: string) {
  // Deleting an organization cascades to its matches, research history and
  // members, so it stays with staff even for one's own organization.
  await requireStaff();

  const org = await prisma.organization.delete({ where: { id: orgId } });
  const base = org.kind === 'SEEKER' ? '/seekers' : '/donors';
  revalidatePath(base);
  redirect(base);
}
