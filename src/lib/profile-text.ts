/**
 * Renders CRM records into the plain-text blocks the AI flows read.
 *
 * Every flow takes prose rather than a JSON dump: the fields that matter most
 * here (what an organization does NOT do, what a funder will NOT fund) are
 * long-form, and labelling them in sentences gets far better use out of them
 * than nesting them in an object the model has to interpret structurally.
 *
 * These renderers are also the single place that decides what the model is
 * allowed to see, which keeps unrelated CRM notes out of generated documents.
 */

import type { ComplianceItem, Contact, DonorProfile, Organization, SeekerProfile } from '@prisma/client';

export const COMPLIANCE_LABELS: Record<ComplianceItem['type'], string> = {
  FORM_990: 'IRS Form 990',
  GOOD_STANDING: 'Certificate of Good Standing',
  IRS_DETERMINATION: 'IRS 501(c)(3) determination letter',
  AUDITED_FINANCIALS: 'Audited financial statements',
  BOARD_ROSTER: 'Board roster',
  STATE_CHARITY_REGISTRATION: 'State charity registration',
};

/** The items a seeker is expected to hold before applying anywhere locally. */
export const REQUIRED_COMPLIANCE: ComplianceItem['type'][] = [
  'FORM_990',
  'GOOD_STANDING',
  'IRS_DETERMINATION',
];

function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? `${label}: ${value.join(', ')}` : null;
  const text = String(value).trim();
  return text ? `${label}: ${text}` : null;
}

function money(value: number | null): string | null {
  return value === null ? null : `$${value.toLocaleString('en-US')}`;
}

export type SeekerRecord = Organization & {
  seekerProfile: SeekerProfile | null;
  contacts: Contact[];
  compliance: ComplianceItem[];
};

export function renderSeekerProfile(org: SeekerRecord): string {
  const p = org.seekerProfile;
  const address = [org.addressLine, org.city, org.state, org.postalCode].filter(Boolean).join(', ');
  const primary = org.contacts.find(c => c.isPrimary) ?? org.contacts[0];

  return [
    line('Mission statement (as published)', org.mission),
    line('Who they really serve', p?.servesWho),
    line('What they really do', p?.doesWhat),
    line('What they do NOT do', p?.doesNotDo),
    line('Who they do NOT serve', p?.doesNotServe),
    line('Populations', p?.populations),
    line('Service areas', p?.serviceAreas),
    line('Program areas', p?.programAreas),
    line('Evidenced outcomes', p?.outcomes),
    line('Year founded', p?.yearFounded),
    line('Annual budget', p?.annualBudget ? money(p.annualBudget) : null),
    line('Paid staff', p?.staffCount),
    line('Volunteers', p?.volunteerCount),
    line('EIN', org.ein),
    line('Website', org.website),
    line('Address', address),
    line('Phone', org.phone),
    primary
      ? line(
          'Primary contact',
          [primary.name, primary.title, primary.email, primary.phone].filter(Boolean).join(' | '),
        )
      : null,
    line(
      'Documentation on file',
      org.compliance
        .filter(c => c.status === 'VERIFIED')
        .map(c => `${COMPLIANCE_LABELS[c.type]}${c.periodLabel ? ` (${c.periodLabel})` : ''}`),
    ),
    line(
      'Documentation missing or unverified',
      org.compliance
        .filter(c => c.status !== 'VERIFIED')
        .map(c => `${COMPLIANCE_LABELS[c.type]} — ${c.status.toLowerCase()}`),
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

export type DonorRecord = Organization & {
  donorProfile: DonorProfile | null;
  contacts: Contact[];
};

export function renderDonorProfile(org: DonorRecord): string {
  const p = org.donorProfile;
  const range =
    p?.grantMin || p?.grantMax
      ? `${money(p.grantMin) ?? 'unstated'} to ${money(p.grantMax) ?? 'unstated'}`
      : null;

  return [
    line('About this funder', org.mission),
    line('Funding focus areas', p?.fundingFocus),
    line('Explicitly does NOT fund', p?.excludedSectors),
    line('Populations prioritized', p?.populationsServed),
    line('Geographies funded', p?.geographies),
    line('Typical award range', range),
    line('Cycle and deadlines', p?.cycleNotes),
    line('Next deadline', p?.nextDeadline?.toISOString().slice(0, 10)),
    line('Application portal', p?.applicationPortal),
    line('Application URL', p?.applicationUrl),
    line('Letter of intent required', p ? String(p.requiresLoi) : null),
    line('Requires Form 990', p ? String(p.requires990) : null),
    line('Requires good standing', p ? String(p.requiresGoodStanding) : null),
    line('Giving notes', p?.givingNotes),
    line('Website', org.website),
    line(
      'Criteria last researched',
      p?.lastResearchedAt
        ? `${p.lastResearchedAt.toISOString().slice(0, 10)}${p.researchGrounded ? ' (from live sources)' : ' (unverified)'}`
        : 'never — criteria are hand-entered only',
    ),
  ]
    .filter(Boolean)
    .join('\n');
}

/** Compact context handed to the interviewer so it doesn't re-ask known facts. */
export function renderInterviewContext(org: SeekerRecord | DonorRecord): string {
  return 'seekerProfile' in org && org.seekerProfile !== undefined
    ? renderSeekerProfile(org as SeekerRecord)
    : renderDonorProfile(org as DonorRecord);
}
