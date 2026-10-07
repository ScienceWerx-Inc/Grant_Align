/**
 * Entity types for the Firestore backend.
 *
 * Replaces the Prisma-generated types. Field names match the old Prisma schema
 * 1:1 so page and component code needs only an import change.
 */

export type OrgKind = 'SEEKER' | 'DONOR';
export type UserRole = 'SEEKER' | 'DONOR' | 'STAFF';

export type ComplianceType =
  | 'FORM_990'
  | 'GOOD_STANDING'
  | 'IRS_DETERMINATION'
  | 'AUDITED_FINANCIALS'
  | 'BOARD_ROSTER'
  | 'STATE_CHARITY_REGISTRATION';

export type ComplianceStatus = 'MISSING' | 'PENDING' | 'VERIFIED' | 'EXPIRED';

export type InterviewRole = 'SEEKER' | 'DONOR';
export type InterviewStatus = 'IN_PROGRESS' | 'COMPLETE';
export type MatchVerdict = 'APPLY' | 'MAYBE' | 'SKIP';
export type ResearchStatus = 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface Organization {
  id: string;
  kind: OrgKind;
  name: string;
  ein: string | null;
  website: string | null;
  mission: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  notes: string | null;
  isSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppUser {
  /** Firebase Auth uid. */
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  orgId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  orgId: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
  notes: string | null;
  createdAt: Date;
}

export interface SeekerProfile {
  id: string;
  orgId: string;
  servesWho: string | null;
  doesWhat: string | null;
  doesNotDo: string | null;
  doesNotServe: string | null;
  populations: string[];
  serviceAreas: string[];
  programAreas: string[];
  outcomes: string | null;
  yearFounded: number | null;
  annualBudget: number | null;
  staffCount: number | null;
  volunteerCount: number | null;
  interviewComplete: boolean;
  updatedAt: Date;
}

export interface DonorProfile {
  id: string;
  orgId: string;
  fundingFocus: string[];
  excludedSectors: string[];
  populationsServed: string[];
  geographies: string[];
  grantMin: number | null;
  grantMax: number | null;
  cycleNotes: string | null;
  nextDeadline: Date | null;
  applicationPortal: string | null;
  applicationUrl: string | null;
  requiresLoi: boolean;
  requires990: boolean;
  requiresGoodStanding: boolean;
  givingNotes: string | null;
  lastResearchedAt: Date | null;
  researchGrounded: boolean;
  updatedAt: Date;
}

export interface ComplianceItem {
  id: string;
  orgId: string;
  type: ComplianceType;
  status: ComplianceStatus;
  periodLabel: string | null;
  expiresAt: Date | null;
  documentUrl: string | null;
  notes: string | null;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  at: string;
}

export interface InterviewSession {
  id: string;
  orgId: string;
  role: InterviewRole;
  status: InterviewStatus;
  messages: ChatMessage[];
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchSource {
  title: string;
  url: string;
}

export interface ResearchRun {
  id: string;
  orgId: string;
  source: string;
  status: ResearchStatus;
  grounded: boolean;
  dossier: string | null;
  sources: ResearchSource[];
  extracted: Record<string, unknown> | null;
  error: string | null;
  triggeredBy: string;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface MatchDimension {
  dimension: string;
  weight: number;
  score: number;
  note: string;
}

export interface Match {
  id: string;
  seekerOrgId: string;
  donorOrgId: string;
  score: number;
  verdict: MatchVerdict;
  headline: string;
  rationale: string;
  dimensions: MatchDimension[];
  alignments: string[];
  gaps: string[];
  blockers: string[];
  computedAt: Date;
}

/** Firestore document id for a seeker/donor pair. */
export function matchId(seekerOrgId: string, donorOrgId: string): string {
  return `${seekerOrgId}_${donorOrgId}`;
}

/** An enquiry from the public contact page. Stored, not emailed. */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  organization: string | null;
  message: string;
  handledAt: Date | null;
  createdAt: Date;
}
