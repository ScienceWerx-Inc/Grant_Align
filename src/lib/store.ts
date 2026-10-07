/**
 * Firestore data-access layer. Replaces Prisma.
 *
 * Layout mirrors the old Postgres schema:
 *   organizations/{id}            Organization
 *   users/{firebaseUid}           AppUser (doc id = Firebase Auth uid)
 *   contacts/{autoId}             Contact (field orgId)
 *   seekerProfiles/{orgId}        SeekerProfile (doc id = orgId)
 *   donorProfiles/{orgId}         DonorProfile (doc id = orgId)
 *   complianceItems/{autoId}      ComplianceItem (fields orgId + type)
 *   interviewSessions/{autoId}    InterviewSession (field orgId)
 *   researchRuns/{autoId}         ResearchRun (field orgId)
 *   matches/{seekerId_donorId}    Match (fields seekerOrgId + donorOrgId)
 *
 * Queries are kept deliberately simple (single-field filters + in-memory
 * sorting/filtering): the dataset is dozens of organizations, and simple
 * queries need no composite indexes. Dates are returned as `Date` objects so
 * callers keep using `.toISOString()` / `.toLocaleDateString()` unchanged.
 */

import 'server-only';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { matchId, type AppUser, type ComplianceItem, type ComplianceStatus, type ComplianceType, type Contact, type ContactMessage, type DonorProfile, type InterviewRole, type InterviewSession, type InterviewStatus, type Match, type MatchVerdict, type Organization, type OrgKind, type ResearchRun, type ResearchStatus, type SeekerProfile, type UserRole } from '@/lib/types';

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate(): Date }).toDate();
  }
  const d = new Date(value as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function reqDate(value: unknown, fallback = new Date(0)): Date {
  return toDate(value) ?? fallback;
}

function now() {
  return FieldValue.serverTimestamp();
}

/** Strip undefined values; Firestore rejects them unless ignored. */
function clean<T extends Record<string, unknown>>(data: T): T {
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)) as T;
}

// --- Row decoders (Firestore doc -> typed entity) ---------------------------

function decodeOrg(id: string, d: Record<string, unknown>): Organization {
  return {
    id,
    kind: d.kind as OrgKind,
    name: String(d.name ?? ''),
    ein: (d.ein as string | null) ?? null,
    website: (d.website as string | null) ?? null,
    mission: (d.mission as string | null) ?? null,
    addressLine: (d.addressLine as string | null) ?? null,
    city: (d.city as string | null) ?? null,
    state: (d.state as string | null) ?? null,
    postalCode: (d.postalCode as string | null) ?? null,
    phone: (d.phone as string | null) ?? null,
    notes: (d.notes as string | null) ?? null,
    isSeed: Boolean(d.isSeed ?? false),
    verified: d.verified === undefined ? true : Boolean(d.verified),
    createdBy: (d.createdBy as string | null) ?? null,
    createdAt: reqDate(d.createdAt, new Date(0)),
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeUser(id: string, d: Record<string, unknown>): AppUser {
  return {
    id,
    email: String(d.email ?? ''),
    name: (d.name as string | null) ?? null,
    role: (d.role as UserRole) ?? 'SEEKER',
    orgId: (d.orgId as string | null) ?? null,
    emailVerified: Boolean(d.emailVerified ?? false),
    requestedOrgId: (d.requestedOrgId as string | null) ?? null,
    createdAt: reqDate(d.createdAt, new Date(0)),
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeContact(id: string, d: Record<string, unknown>): Contact {
  return {
    id,
    orgId: String(d.orgId ?? ''),
    name: String(d.name ?? ''),
    title: (d.title as string | null) ?? null,
    email: (d.email as string | null) ?? null,
    phone: (d.phone as string | null) ?? null,
    isPrimary: Boolean(d.isPrimary ?? false),
    notes: (d.notes as string | null) ?? null,
    createdAt: reqDate(d.createdAt, new Date(0)),
  };
}

function decodeSeekerProfile(orgId: string, d: Record<string, unknown>): SeekerProfile {
  return {
    id: String(d.id ?? orgId),
    orgId,
    servesWho: (d.servesWho as string | null) ?? null,
    doesWhat: (d.doesWhat as string | null) ?? null,
    doesNotDo: (d.doesNotDo as string | null) ?? null,
    doesNotServe: (d.doesNotServe as string | null) ?? null,
    populations: (d.populations as string[]) ?? [],
    serviceAreas: (d.serviceAreas as string[]) ?? [],
    programAreas: (d.programAreas as string[]) ?? [],
    outcomes: (d.outcomes as string | null) ?? null,
    yearFounded: (d.yearFounded as number | null) ?? null,
    annualBudget: (d.annualBudget as number | null) ?? null,
    staffCount: (d.staffCount as number | null) ?? null,
    volunteerCount: (d.volunteerCount as number | null) ?? null,
    interviewComplete: Boolean(d.interviewComplete ?? false),
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeDonorProfile(orgId: string, d: Record<string, unknown>): DonorProfile {
  return {
    id: String(d.id ?? orgId),
    orgId,
    fundingFocus: (d.fundingFocus as string[]) ?? [],
    excludedSectors: (d.excludedSectors as string[]) ?? [],
    populationsServed: (d.populationsServed as string[]) ?? [],
    geographies: (d.geographies as string[]) ?? [],
    grantMin: (d.grantMin as number | null) ?? null,
    grantMax: (d.grantMax as number | null) ?? null,
    cycleNotes: (d.cycleNotes as string | null) ?? null,
    nextDeadline: toDate(d.nextDeadline),
    applicationPortal: (d.applicationPortal as string | null) ?? null,
    applicationUrl: (d.applicationUrl as string | null) ?? null,
    requiresLoi: Boolean(d.requiresLoi ?? false),
    requires990: d.requires990 !== false,
    requiresGoodStanding: d.requiresGoodStanding !== false,
    givingNotes: (d.givingNotes as string | null) ?? null,
    lastResearchedAt: toDate(d.lastResearchedAt),
    researchGrounded: Boolean(d.researchGrounded ?? false),
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeCompliance(id: string, d: Record<string, unknown>): ComplianceItem {
  return {
    id,
    orgId: String(d.orgId ?? ''),
    type: d.type as ComplianceType,
    status: (d.status as ComplianceStatus) ?? 'MISSING',
    periodLabel: (d.periodLabel as string | null) ?? null,
    expiresAt: toDate(d.expiresAt),
    documentUrl: (d.documentUrl as string | null) ?? null,
    notes: (d.notes as string | null) ?? null,
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeInterview(id: string, d: Record<string, unknown>): InterviewSession {
  const messages = Array.isArray(d.messages) ? d.messages : [];
  return {
    id,
    orgId: String(d.orgId ?? ''),
    role: d.role as InterviewRole,
    status: (d.status as InterviewStatus) ?? 'IN_PROGRESS',
    messages: messages as InterviewSession['messages'],
    summary: (d.summary as string | null) ?? null,
    createdAt: reqDate(d.createdAt, new Date(0)),
    updatedAt: reqDate(d.updatedAt, new Date(0)),
  };
}

function decodeRun(id: string, d: Record<string, unknown>): ResearchRun {
  const sources = Array.isArray(d.sources) ? d.sources : [];
  return {
    id,
    orgId: String(d.orgId ?? ''),
    source: String(d.source ?? ''),
    status: (d.status as ResearchStatus) ?? 'RUNNING',
    grounded: Boolean(d.grounded ?? false),
    dossier: (d.dossier as string | null) ?? null,
    sources: sources as ResearchRun['sources'],
    extracted: (d.extracted as Record<string, unknown> | null) ?? null,
    error: (d.error as string | null) ?? null,
    triggeredBy: String(d.triggeredBy ?? 'manual'),
    startedAt: reqDate(d.startedAt, new Date(0)),
    finishedAt: toDate(d.finishedAt),
  };
}

function decodeMatch(id: string, d: Record<string, unknown>): Match {
  return {
    id,
    seekerOrgId: String(d.seekerOrgId ?? ''),
    donorOrgId: String(d.donorOrgId ?? ''),
    score: Number(d.score ?? 0),
    verdict: d.verdict as MatchVerdict,
    headline: String(d.headline ?? ''),
    rationale: String(d.rationale ?? ''),
    dimensions: (Array.isArray(d.dimensions) ? d.dimensions : []) as Match['dimensions'],
    alignments: (d.alignments as string[]) ?? [],
    gaps: (d.gaps as string[]) ?? [],
    blockers: (d.blockers as string[]) ?? [],
    computedAt: reqDate(d.computedAt, new Date(0)),
  };
}

function db_(): Firestore {
  return adminDb();
}

async function getDoc<T>(
  collection: string,
  id: string,
  decode: (id: string, d: Record<string, unknown>) => T,
): Promise<T | null> {
  const snap = await db_().collection(collection).doc(id).get();
  if (!snap.exists) return null;
  return decode(snap.id, snap.data() as Record<string, unknown>);
}

async function listWhere<T>(
  collection: string,
  field: string,
  value: unknown,
  decode: (id: string, d: Record<string, unknown>) => T,
): Promise<T[]> {
  const snap = await db_().collection(collection).where(field, '==', value).get();
  return snap.docs.map(d => decode(d.id, d.data() as Record<string, unknown>));
}

// ---------------------------------------------------------------------------
// Composite record types (replace Prisma `include` shapes)
// ---------------------------------------------------------------------------

export type OrgWithSeeker = Organization & {
  seekerProfile: SeekerProfile | null;
  contacts: Contact[];
  compliance: ComplianceItem[];
};

export type OrgWithDonor = Organization & {
  donorProfile: DonorProfile | null;
  contacts: Contact[];
};

export type SeekerListRow = Organization & {
  seekerProfile: SeekerProfile | null;
  compliance: ComplianceItem[];
  matchCount: number;
};

export type DonorListRow = Organization & {
  donorProfile: DonorProfile | null;
  matchCount: number;
};

export type SeekerDetail = Organization & {
  seekerProfile: SeekerProfile | null;
  contacts: Contact[];
  compliance: ComplianceItem[];
  matches: (Match & { donor: Organization })[];
  latestInterview: InterviewSession | null;
};

export type DonorDetail = Organization & {
  donorProfile: DonorProfile | null;
  contacts: Contact[];
  researchRuns: ResearchRun[];
  matches: (Match & { seeker: Organization })[];
  latestInterview: InterviewSession | null;
};

export type MatchWithOrgs = Match & { seeker: Organization; donor: Organization };

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export async function createOrganization(data: {
  kind: OrgKind;
  name: string;
  ein?: string | null;
  website?: string | null;
  mission?: string | null;
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  notes?: string | null;
  verified?: boolean;
  createdBy?: string | null;
}): Promise<Organization> {
  const ref = db_().collection('organizations').doc();
  const payload = clean({
    kind: data.kind,
    name: data.name,
    ein: data.ein ?? null,
    website: data.website ?? null,
    mission: data.mission ?? null,
    addressLine: data.addressLine ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    postalCode: data.postalCode ?? null,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    isSeed: false,
    verified: data.verified ?? true,
    createdBy: data.createdBy ?? null,
    createdAt: now(),
    updatedAt: now(),
  });
  await ref.set(payload);
  const created = await getOrganization(ref.id);
  if (!created) throw new Error('Failed to create organization.');
  if (data.kind === 'SEEKER') {
    await ref.collection('__init').doc('x').delete().catch(() => {});
    await ensureProfileDocs(ref.id, 'SEEKER');
    await createDefaultCompliance(ref.id);
  } else {
    await ensureProfileDocs(ref.id, 'DONOR');
  }
  return created;
}

export async function getOrganization(id: string): Promise<Organization | null> {
  return getDoc('organizations', id, decodeOrg);
}

export async function getOrganizationOrThrow(id: string): Promise<Organization> {
  const org = await getOrganization(id);
  if (!org) throw new NotFoundError(`Organization ${id} not found.`);
  return org;
}

export async function findOrganizationByName(kind: OrgKind, name: string): Promise<Organization | null> {
  const rows = await listWhere('organizations', 'kind', kind, decodeOrg);
  return rows.find(o => o.name === name) ?? null;
}

export async function listOrganizations(kind?: OrgKind): Promise<Organization[]> {
  const col = db_().collection('organizations');
  const snap = kind ? await col.where('kind', '==', kind).get() : await col.get();
  const rows = snap.docs.map(d => decodeOrg(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

export async function updateOrganization(
  id: string,
  data: Partial<Omit<Organization, 'id' | 'createdAt' | 'updatedAt'>>,
): Promise<Organization> {
  await db_()
    .collection('organizations')
    .doc(id)
    .update(clean({ ...data, updatedAt: now() }));
  return getOrganizationOrThrow(id);
}

export async function deleteOrganizationCascade(id: string): Promise<Organization> {
  const org = await getOrganizationOrThrow(id);
  const collections = [
    'contacts',
    'complianceItems',
    'interviewSessions',
    'researchRuns',
    'matches',
  ];
  // Matches reference the org by field rather than doc id.
  const batch: Promise<unknown>[] = [];
  for (const col of ['contacts', 'complianceItems', 'interviewSessions', 'researchRuns']) {
    batch.push(
      db_()
        .collection(col)
        .where('orgId', '==', id)
        .get()
        .then(snap => {
          const b = db_().batch();
          snap.docs.forEach(d => b.delete(d.ref));
          return snap.empty ? null : b.commit();
        }),
    );
  }
  batch.push(
    db_()
      .collection('matches')
      .where('seekerOrgId', '==', id)
      .get()
      .then(snap => {
        const b = db_().batch();
        snap.docs.forEach(d => b.delete(d.ref));
        return snap.empty ? null : b.commit();
      }),
  );
  batch.push(
    db_()
      .collection('matches')
      .where('donorOrgId', '==', id)
      .get()
      .then(snap => {
        const b = db_().batch();
        snap.docs.forEach(d => b.delete(d.ref));
        return snap.empty ? null : b.commit();
      }),
  );
  batch.push(db_().collection('seekerProfiles').doc(id).delete().catch(() => {}));
  batch.push(db_().collection('donorProfiles').doc(id).delete().catch(() => {}));
  // Users pointing at this org are unlinked, not deleted.
  batch.push(
    db_()
      .collection('users')
      .where('orgId', '==', id)
      .get()
      .then(snap => {
        const b = db_().batch();
        snap.docs.forEach(d => b.update(d.ref, { orgId: null, updatedAt: now() }));
        return snap.empty ? null : b.commit();
      }),
  );
  await Promise.all(batch);
  await db_().collection('organizations').doc(id).delete();
  void collections;
  return org;
}

export async function countOrganizations(kind?: OrgKind): Promise<number> {
  const col = db_().collection('organizations');
  const snap = kind ? await col.where('kind', '==', kind).count().get() : await col.count().get();
  return snap.data().count;
}

// ---------------------------------------------------------------------------
// Users (authorization profiles; credentials live in Firebase Auth)
// ---------------------------------------------------------------------------

export async function getAppUser(uid: string): Promise<(AppUser & { org: Organization | null }) | null> {
  const user = await getDoc('users', uid, decodeUser);
  if (!user) return null;
  const org = user.orgId ? await getOrganization(user.orgId) : null;
  return { ...user, org };
}

export async function createAppUser(data: {
  id: string;
  email: string;
  name?: string | null;
  role?: UserRole;
}): Promise<AppUser & { org: Organization | null }> {
  const payload = clean({
    email: data.email,
    name: data.name ?? null,
    role: data.role ?? 'SEEKER',
    orgId: null,
    createdAt: now(),
    updatedAt: now(),
  });
  await db_().collection('users').doc(data.id).set(payload);
  const created = await getAppUser(data.id);
  if (!created) throw new Error('Failed to create user profile.');
  return created;
}

export async function upsertAppUser(data: {
  id: string;
  email: string;
  name?: string | null;
  role?: UserRole;
}): Promise<void> {
  const ref = db_().collection('users').doc(data.id);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      clean({
        email: data.email,
        name: data.name ?? null,
        role: data.role ?? 'SEEKER',
        orgId: null,
        createdAt: now(),
        updatedAt: now(),
      }),
    );
  } else {
    await ref.update(clean({ email: data.email, name: data.name ?? undefined, ...(data.role ? { role: data.role } : {}), updatedAt: now() }));
  }
}

export async function updateAppUser(
  uid: string,
  data: {
    role?: UserRole;
    orgId?: string | null;
    name?: string | null;
    emailVerified?: boolean;
    requestedOrgId?: string | null;
  },
): Promise<void> {
  await db_()
    .collection('users')
    .doc(uid)
    .update(clean({ ...data, updatedAt: now() }));
}

/** Organizations created through onboarding that staff have not reviewed. */
export async function listUnverifiedOrganizations(): Promise<Organization[]> {
  const rows = await listWhere('organizations', 'verified', false, decodeOrg);
  return rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function setOrganizationVerified(id: string, verified: boolean): Promise<void> {
  await db_().collection('organizations').doc(id).update({ verified, updatedAt: now() });
}

export async function listUsers(): Promise<(AppUser & { org: Organization | null })[]> {
  const snap = await db_().collection('users').get();
  const users = snap.docs.map(d => decodeUser(d.id, d.data() as Record<string, unknown>));
  users.sort((a, b) => (a.role === b.role ? a.email.localeCompare(b.email) : a.role.localeCompare(b.role)));
  const orgs = new Map<string, Organization>();
  for (const u of users) {
    if (u.orgId && !orgs.has(u.orgId)) {
      const org = await getOrganization(u.orgId);
      if (org) orgs.set(u.orgId, org);
    }
  }
  return users.map(u => ({ ...u, org: u.orgId ? (orgs.get(u.orgId) ?? null) : null }));
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

async function ensureProfileDocs(orgId: string, kind: OrgKind): Promise<void> {
  const col = kind === 'SEEKER' ? 'seekerProfiles' : 'donorProfiles';
  const ref = db_().collection(col).doc(orgId);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set(
      kind === 'SEEKER'
        ? { id: orgId, orgId, populations: [], serviceAreas: [], programAreas: [], interviewComplete: false, updatedAt: now() }
        : {
            id: orgId,
            orgId,
            fundingFocus: [],
            excludedSectors: [],
            populationsServed: [],
            geographies: [],
            requiresLoi: false,
            requires990: true,
            requiresGoodStanding: true,
            researchGrounded: false,
            updatedAt: now(),
          },
    );
  }
}

export async function getSeekerProfile(orgId: string): Promise<SeekerProfile | null> {
  return getDoc('seekerProfiles', orgId, (id, d) => decodeSeekerProfile(orgId, { id, ...d }));
}

export async function getDonorProfile(orgId: string): Promise<DonorProfile | null> {
  return getDoc('donorProfiles', orgId, (id, d) => decodeDonorProfile(orgId, { id, ...d }));
}

export async function upsertSeekerProfile(
  orgId: string,
  data: Partial<Omit<SeekerProfile, 'id' | 'orgId' | 'updatedAt'>>,
): Promise<void> {
  const ref = db_().collection('seekerProfiles').doc(orgId);
  const snap = await ref.get();
  const payload = clean({ ...data, updatedAt: now() });
  if (!snap.exists) {
    await ref.set({ id: orgId, orgId, populations: [], serviceAreas: [], programAreas: [], interviewComplete: false, ...payload });
  } else {
    await ref.update(payload);
  }
}

export async function upsertDonorProfile(
  orgId: string,
  data: Partial<Omit<DonorProfile, 'id' | 'orgId' | 'updatedAt'>>,
): Promise<void> {
  const ref = db_().collection('donorProfiles').doc(orgId);
  const snap = await ref.get();
  const payload = clean({ ...data, updatedAt: now() });
  if (!snap.exists) {
    await ref.set({
      id: orgId,
      orgId,
      fundingFocus: [],
      excludedSectors: [],
      populationsServed: [],
      geographies: [],
      requiresLoi: false,
      requires990: true,
      requiresGoodStanding: true,
      researchGrounded: false,
      ...payload,
    });
  } else {
    await ref.update(payload);
  }
}

export async function touchDonorResearch(orgId: string, grounded: boolean): Promise<void> {
  await upsertDonorProfile(orgId, { lastResearchedAt: new Date(), researchGrounded: grounded });
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function listContacts(orgId: string): Promise<Contact[]> {
  const rows = await listWhere('contacts', 'orgId', orgId, decodeContact);
  rows.sort((a, b) =>
    a.isPrimary === b.isPrimary ? a.name.localeCompare(b.name) : a.isPrimary ? -1 : 1,
  );
  return rows;
}

export async function createContact(data: {
  orgId: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
}): Promise<Contact> {
  const ref = db_().collection('contacts').doc();
  await ref.set(clean({ ...data, isPrimary: data.isPrimary ?? false, createdAt: now() }));
  const snap = await ref.get();
  return decodeContact(ref.id, snap.data() as Record<string, unknown>);
}

export async function clearPrimaryContacts(orgId: string): Promise<void> {
  const snap = await db_()
    .collection('contacts')
    .where('orgId', '==', orgId)
    .where('isPrimary', '==', true)
    .get();
  const batch = db_().batch();
  snap.docs.forEach(d => batch.update(d.ref, { isPrimary: false }));
  if (!snap.empty) await batch.commit();
}

export async function getContactOrThrow(id: string): Promise<Contact> {
  const contact = await getDoc('contacts', id, decodeContact);
  if (!contact) throw new NotFoundError(`Contact ${id} not found.`);
  return contact;
}

export async function deleteContact(id: string): Promise<Contact> {
  const contact = await getContactOrThrow(id);
  await db_().collection('contacts').doc(id).delete();
  return contact;
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

const DEFAULT_COMPLIANCE: ComplianceType[] = ['FORM_990', 'GOOD_STANDING', 'IRS_DETERMINATION'];

export async function createDefaultCompliance(orgId: string): Promise<void> {
  for (const type of DEFAULT_COMPLIANCE) {
    await upsertComplianceItem(orgId, type, {});
  }
}

export async function listCompliance(orgId: string): Promise<ComplianceItem[]> {
  const rows = await listWhere('complianceItems', 'orgId', orgId, decodeCompliance);
  rows.sort((a, b) => a.type.localeCompare(b.type));
  return rows;
}

export async function getComplianceItemOrThrow(id: string): Promise<ComplianceItem> {
  const item = await getDoc('complianceItems', id, decodeCompliance);
  if (!item) throw new NotFoundError(`Compliance item ${id} not found.`);
  return item;
}

export async function updateComplianceItem(
  id: string,
  data: { status?: ComplianceStatus; periodLabel?: string | null; documentUrl?: string | null; notes?: string | null },
): Promise<ComplianceItem> {
  await db_()
    .collection('complianceItems')
    .doc(id)
    .update(clean({ ...data, updatedAt: now() }));
  return getComplianceItemOrThrow(id);
}

export async function upsertComplianceItem(
  orgId: string,
  type: ComplianceType,
  data: { status?: ComplianceStatus; periodLabel?: string | null; documentUrl?: string | null; notes?: string | null },
): Promise<ComplianceItem> {
  const snap = await db_()
    .collection('complianceItems')
    .where('orgId', '==', orgId)
    .where('type', '==', type)
    .limit(1)
    .get();
  if (snap.empty) {
    const ref = db_().collection('complianceItems').doc();
    await ref.set(clean({ orgId, type, status: 'MISSING', ...data, updatedAt: now() }));
    return getComplianceItemOrThrow(ref.id);
  }
  const doc = snap.docs[0];
  if (Object.keys(data).length) await doc.ref.update(clean({ ...data, updatedAt: now() }));
  return decodeCompliance(doc.id, doc.data() as Record<string, unknown>);
}

// ---------------------------------------------------------------------------
// Interviews
// ---------------------------------------------------------------------------

export async function getInterviewSession(id: string): Promise<InterviewSession | null> {
  return getDoc('interviewSessions', id, decodeInterview);
}

export async function findLatestInProgressSession(
  orgId: string,
  role: InterviewRole,
): Promise<InterviewSession | null> {
  const snap = await db_()
    .collection('interviewSessions')
    .where('orgId', '==', orgId)
    .where('role', '==', role)
    .where('status', '==', 'IN_PROGRESS')
    .get();
  const rows = snap.docs.map(d => decodeInterview(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return rows[0] ?? null;
}

export async function latestInterviewForOrg(orgId: string, role: InterviewRole): Promise<InterviewSession | null> {
  const snap = await db_()
    .collection('interviewSessions')
    .where('orgId', '==', orgId)
    .where('role', '==', role)
    .get();
  const rows = snap.docs.map(d => decodeInterview(d.id, d.data() as Record<string, unknown>));
  rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  return rows[0] ?? null;
}

export async function createInterviewSession(orgId: string, role: InterviewRole): Promise<InterviewSession> {
  const ref = db_().collection('interviewSessions').doc();
  await ref.set({ orgId, role, status: 'IN_PROGRESS', messages: [], summary: null, createdAt: now(), updatedAt: now() });
  const created = await getInterviewSession(ref.id);
  if (!created) throw new Error('Failed to create interview session.');
  return created;
}

export async function updateInterviewSession(
  id: string,
  data: { messages?: InterviewSession['messages']; status?: InterviewStatus; summary?: string | null },
): Promise<void> {
  await db_()
    .collection('interviewSessions')
    .doc(id)
    .update(clean({ ...data, updatedAt: now() }));
}

// ---------------------------------------------------------------------------
// Research runs
// ---------------------------------------------------------------------------

export async function createResearchRun(orgId: string, source: string, triggeredBy: string): Promise<ResearchRun> {
  const ref = db_().collection('researchRuns').doc();
  await ref.set({
    orgId,
    source,
    status: 'RUNNING',
    grounded: false,
    dossier: null,
    sources: [],
    extracted: null,
    error: null,
    triggeredBy,
    startedAt: now(),
    finishedAt: null,
  });
  const created = await getResearchRunOrThrow(ref.id);
  return created;
}

export async function updateResearchRun(
  id: string,
  data: Partial<Pick<ResearchRun, 'status' | 'grounded' | 'dossier' | 'sources' | 'extracted' | 'error'>> & { finishedAt?: Date | null },
): Promise<void> {
  await db_()
    .collection('researchRuns')
    .doc(id)
    .update(clean({ ...data, finishedAt: data.finishedAt ?? now() }));
}

export async function failResearchRun(id: string, error: string): Promise<void> {
  await db_()
    .collection('researchRuns')
    .doc(id)
    .update({ status: 'FAILED', error, finishedAt: now() });
}

export async function getResearchRunOrThrow(id: string): Promise<ResearchRun> {
  const run = await getDoc('researchRuns', id, decodeRun);
  if (!run) throw new NotFoundError(`Research run ${id} not found.`);
  return run;
}

export async function listRecentResearchRuns(orgId: string, limit = 5): Promise<ResearchRun[]> {
  const rows = await listWhere('researchRuns', 'orgId', orgId, decodeRun);
  rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
  return rows.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Matches
// ---------------------------------------------------------------------------

export async function upsertMatch(data: {
  seekerOrgId: string;
  donorOrgId: string;
  score: number;
  verdict: MatchVerdict;
  headline: string;
  rationale: string;
  dimensions: Match['dimensions'];
  alignments: string[];
  gaps: string[];
  blockers: string[];
}): Promise<void> {
  await db_()
    .collection('matches')
    .doc(matchId(data.seekerOrgId, data.donorOrgId))
    .set(clean({ ...data, computedAt: now() }), { merge: true });
}

export async function listMatches(filters?: {
  seekerOrgId?: string;
  donorOrgId?: string;
  verdicts?: MatchVerdict[];
  orderByScoreDesc?: boolean;
  take?: number;
}): Promise<Match[]> {
  let query: FirebaseFirestore.Query = db_().collection('matches');
  if (filters?.seekerOrgId) query = query.where('seekerOrgId', '==', filters.seekerOrgId);
  if (filters?.donorOrgId) query = query.where('donorOrgId', '==', filters.donorOrgId);
  const snap = await query.get();
  let rows = snap.docs.map(d => decodeMatch(d.id, d.data() as Record<string, unknown>));
  if (filters?.verdicts) rows = rows.filter(m => filters.verdicts!.includes(m.verdict));
  rows.sort((a, b) => b.score - a.score);
  if (filters?.take) rows = rows.slice(0, filters.take);
  return rows;
}

export async function countMatches(where?: { verdict?: MatchVerdict }): Promise<number> {
  if (!where?.verdict) {
    const snap = await db_().collection('matches').count().get();
    return snap.data().count;
  }
  const snap = await db_().collection('matches').where('verdict', '==', where.verdict).count().get();
  return snap.data().count;
}

export async function countMatchesForOrg(field: 'seekerOrgId' | 'donorOrgId', orgId: string): Promise<number> {
  const snap = await db_().collection('matches').where(field, '==', orgId).count().get();
  return snap.data().count;
}

export async function topApplyMatch(): Promise<MatchWithOrgs | null> {
  const matches = await listMatches({ verdicts: ['APPLY'], take: 1 });
  if (!matches[0]) return null;
  const m = matches[0];
  const [seeker, donor] = await Promise.all([
    getOrganizationOrThrow(m.seekerOrgId),
    getOrganizationOrThrow(m.donorOrgId),
  ]);
  return { ...m, seeker, donor };
}

// ---------------------------------------------------------------------------
// Composite loaders (replace Prisma `include`)
// ---------------------------------------------------------------------------

export async function getOrgForInterview(orgId: string): Promise<OrgWithSeeker & OrgWithDonor> {
  const org = await getOrganizationOrThrow(orgId);
  const [seekerProfile, donorProfile, contacts, compliance] = await Promise.all([
    getSeekerProfile(orgId),
    getDonorProfile(orgId),
    listContacts(orgId),
    listCompliance(orgId),
  ]);
  return { ...org, seekerProfile, donorProfile, contacts, compliance };
}

export async function listSeekersFull(): Promise<OrgWithSeeker[]> {
  const orgs = await listOrganizations('SEEKER');
  return Promise.all(
    orgs.map(async org => {
      const [seekerProfile, contacts, compliance] = await Promise.all([
        getSeekerProfile(org.id),
        listContacts(org.id),
        listCompliance(org.id),
      ]);
      return { ...org, seekerProfile, contacts, compliance };
    }),
  );
}

export async function listDonorsFull(): Promise<OrgWithDonor[]> {
  const orgs = await listOrganizations('DONOR');
  const rows = await Promise.all(
    orgs.map(async org => {
      const [donorProfile, contacts] = await Promise.all([
        getDonorProfile(org.id),
        listContacts(org.id),
      ]);
      return { ...org, donorProfile, contacts };
    }),
  );
  // Seeds first, then alphabetical (matches old orderBy [{isSeed:desc},{name:asc}]).
  rows.sort((a, b) =>
    a.isSeed === b.isSeed ? a.name.localeCompare(b.name) : a.isSeed ? -1 : 1,
  );
  return rows;
}

export async function listSeekerRows(): Promise<SeekerListRow[]> {
  const orgs = await listSeekersFull();
  return Promise.all(
    orgs.map(async org => ({
      ...org,
      matchCount: await countMatchesForOrg('seekerOrgId', org.id),
    })),
  );
}

export async function listDonorRows(): Promise<DonorListRow[]> {
  const orgs = await listDonorsFull();
  return Promise.all(
    orgs.map(async org => ({
      ...org,
      matchCount: await countMatchesForOrg('donorOrgId', org.id),
    })),
  );
}

export async function getSeekerDetail(id: string): Promise<SeekerDetail | null> {
  const org = await getOrganization(id);
  if (!org || org.kind !== 'SEEKER') return null;
  const [seekerProfile, contacts, compliance, matches, latestInterview] = await Promise.all([
    getSeekerProfile(id),
    listContacts(id),
    listCompliance(id),
    listMatches({ seekerOrgId: id }),
    latestInterviewForOrg(id, 'SEEKER'),
  ]);
  const withDonors = await Promise.all(
    matches.map(async m => ({ ...m, donor: await getOrganizationOrThrow(m.donorOrgId) })),
  );
  return { ...org, seekerProfile, contacts, compliance, matches: withDonors, latestInterview };
}

export async function getDonorDetail(id: string): Promise<DonorDetail | null> {
  const org = await getOrganization(id);
  if (!org || org.kind !== 'DONOR') return null;
  const [donorProfile, contacts, researchRuns, matches, latestInterview] = await Promise.all([
    getDonorProfile(id),
    listContacts(id),
    listRecentResearchRuns(id, 5),
    listMatches({ donorOrgId: id }),
    latestInterviewForOrg(id, 'DONOR'),
  ]);
  const withSeekers = await Promise.all(
    matches.map(async m => ({ ...m, seeker: await getOrganizationOrThrow(m.seekerOrgId) })),
  );
  return { ...org, donorProfile, contacts, researchRuns, matches: withSeekers, latestInterview };
}

export async function getTopMatches(take = 6): Promise<MatchWithOrgs[]> {
  const matches = await listMatches({ verdicts: ['APPLY', 'MAYBE'], take });
  return Promise.all(
    matches.map(async m => {
      const [seeker, donor] = await Promise.all([
        getOrganizationOrThrow(m.seekerOrgId),
        getOrganizationOrThrow(m.donorOrgId),
      ]);
      return { ...m, seeker, donor };
    }),
  );
}

/** Donors that have never been researched or whose research is older than `cutoff`. */
export async function listStaleDonors(cutoff: Date, take: number): Promise<OrgWithDonor[]> {
  const donors = await listDonorsFull();
  const stale = donors.filter(
    d => !d.donorProfile || !d.donorProfile.lastResearchedAt || d.donorProfile.lastResearchedAt < cutoff,
  );
  stale.sort((a, b) => {
    const at = a.donorProfile?.lastResearchedAt?.getTime() ?? 0;
    const bt = b.donorProfile?.lastResearchedAt?.getTime() ?? 0;
    return at - bt;
  });
  return stale.slice(0, take);
}

export async function countResearchedDonors(): Promise<number> {
  const snap = await db_().collection('donorProfiles').get();
  return snap.docs.filter(d => toDate((d.data() as Record<string, unknown>).lastResearchedAt) !== null).length;
}

export async function countUnresearchedDonors(): Promise<number> {
  const donors = await listOrganizations('DONOR');
  const profiles = await Promise.all(donors.map(d => getDonorProfile(d.id)));
  return donors.filter((_, i) => !profiles[i] || !profiles[i]!.lastResearchedAt).length;
}

export async function listOrgOptions(): Promise<{ id: string; name: string; kind: OrgKind }[]> {
  const orgs = await listOrganizations();
  return orgs.map(o => ({ id: o.id, name: o.name, kind: o.kind }));
}

// ---------------------------------------------------------------------------
// Contact messages (public contact form; staff read them at /staff/messages)
// ---------------------------------------------------------------------------

function decodeContactMessage(id: string, d: Record<string, unknown>): ContactMessage {
  return {
    id,
    name: String(d.name ?? ''),
    email: String(d.email ?? ''),
    organization: (d.organization as string | null) ?? null,
    message: String(d.message ?? ''),
    handledAt: toDate(d.handledAt),
    createdAt: reqDate(d.createdAt, new Date(0)),
  };
}

export async function createContactMessage(data: {
  name: string;
  email: string;
  organization?: string | null;
  message: string;
}): Promise<void> {
  const ref = db_().collection('contactMessages').doc();
  await ref.set(clean({ ...data, organization: data.organization ?? null, handledAt: null, createdAt: now() }));
}

export async function listContactMessages(take = 200): Promise<ContactMessage[]> {
  const snap = await db_().collection('contactMessages').get();
  const rows = snap.docs.map(d => decodeContactMessage(d.id, d.data() as Record<string, unknown>));
  // Open messages first, then newest first within each group.
  rows.sort((a, b) =>
    Number(Boolean(a.handledAt)) - Number(Boolean(b.handledAt)) ||
    b.createdAt.getTime() - a.createdAt.getTime(),
  );
  return rows.slice(0, take);
}

export async function markContactMessageHandled(id: string): Promise<void> {
  await db_().collection('contactMessages').doc(id).update({ handledAt: now() });
}
