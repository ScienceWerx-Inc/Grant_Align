/**
 * Seeds the prepopulated donors from requirements §2.3, plus two sample
 * seekers so the matching engine has something to evaluate on a fresh install.
 *
 * Donor criteria are deliberately left thin here — a name, a website, a note on
 * what is publicly known. Filling them in is the scraper's and the donor
 * interviewer's job, and pre-writing plausible criteria would make an empty
 * prototype look researched.
 *
 * Target: Firestore in project grant-align (Firebase Admin credentials from
 * .env). Run with `npm run db:seed`.
 */

import {
  countOrganizations,
  createOrganization,
  findOrganizationByName,
  getDonorProfile,
  listOrganizations,
  deleteOrganizationCascade,
  updateOrganization,
  upsertComplianceItem,
  upsertDonorProfile,
  upsertSeekerProfile,
} from '@/lib/store';
import type { ComplianceStatus, ComplianceType, OrgKind } from '@/lib/types';

const SEED_DONORS: { name: string; website?: string; city?: string; notes?: string }[] = [
  {
    name: 'Ausherman Family Foundation',
    website: 'https://aushermanfamilyfoundation.org',
    city: 'Frederick',
    notes: 'Frederick County community funder. Confirm current grant rounds before applying.',
  },
  {
    name: 'The Community Foundation of Frederick County',
    website: 'https://www.cffredco.org',
    city: 'Frederick',
    notes: 'Administers many donor-advised and scholarship funds; each has its own criteria.',
  },
  {
    name: 'Serini Foundation',
    city: 'Frederick',
    notes: 'Local family foundation. Website unconfirmed — needs research pass.',
  },
  {
    name: 'Delaplaine Foundation',
    website: 'https://delaplainefoundation.org',
    city: 'Frederick',
    notes: 'Long-standing Frederick funder; historically arts, education and community services.',
  },
  {
    name: 'William Cross Foundation',
    city: 'Frederick',
    notes: 'Individual/family giving. Point-of-contact interview likely more useful than scraping.',
  },
  {
    name: 'City of Frederick — Community Grants Program / CDBG',
    website: 'https://www.cityoffrederickmd.gov',
    city: 'Frederick',
    notes: 'Public funding. CDBG carries federal eligibility rules distinct from the local community grants.',
  },
  {
    name: 'Frederick County Government',
    website: 'https://frederickcountymd.gov',
    city: 'Frederick',
    notes: 'County community partnership grants; fiscal-year cycle.',
  },
  // The requirements list two Rotary clubs. Both were dropped from the seed:
  // neither has a website, and neither resolves to an IRS record ("Carroll
  // Creek Rotary Club" matches only "Rotary International", whose finances are
  // a global body's). With no source of any kind they are permanently blank
  // rows, and a matching engine cannot evaluate a funder it knows nothing
  // about. Service-club giving is relationship-driven and small; it is better
  // captured through the donor AI interviewer than through research.
  {
    name: 'United Way of Frederick County',
    website: 'https://www.unitedwayfrederick.org',
    city: 'Frederick',
    notes: 'Frederick County based. Community impact grants; verified IRS record (EIN 52-0607973).',
  },
  {
    name: 'The Harry and Jeanette Weinberg Foundation',
    website: 'https://hjweinbergfoundation.org',
    city: 'Baltimore',
    notes: 'Major Maryland funder of direct services to low-income and vulnerable populations; funds Frederick County organizations.',
  },
  {
    name: 'Marion I. & Henry J. Knott Foundation',
    website: 'https://www.knottfoundation.org',
    city: 'Baltimore',
    notes: 'Maryland-wide funder: education, human services, arts, health.',
  },
  {
    name: 'Nora Roberts Foundation',
    website: 'https://norarobertsfoundation.org',
    city: 'Boonsboro',
    notes: 'Western Maryland author foundation; literacy, children, arts. Verified IRS record (EIN 52-2189081).',
  },
];

/** Donors dropped from earlier versions of the seed, removed on re-seed. */
const RETIRED_DONORS = ['Carroll Creek Rotary Club', 'Frederick Noon Rotary Club'];

async function upsertOrg(kind: OrgKind, name: string, data: Record<string, string | boolean | null>) {
  const existing = await findOrganizationByName(kind, name);
  if (existing) {
    return updateOrganization(existing.id, data);
  }
  return createOrganization({ kind, name, ...data });
}

async function main() {
  // Remove retired seed donors and everything hanging off them, so re-seeding
  // an existing database converges on the current list rather than accumulating.
  const donors = await listOrganizations('DONOR');
  for (const org of donors.filter(d => RETIRED_DONORS.includes(d.name))) {
    await deleteOrganizationCascade(org.id);
    console.log(`Removed retired donor: ${org.name}`);
  }

  for (const donor of SEED_DONORS) {
    const org = await upsertOrg('DONOR', donor.name, {
      website: donor.website ?? null,
      city: donor.city ?? null,
      state: 'MD',
      notes: donor.notes ?? null,
      isSeed: true,
    });
    const profile = await getDonorProfile(org.id);
    await upsertDonorProfile(org.id, {
      geographies: profile?.geographies?.length ? profile.geographies : ['Frederick County, MD'],
    });
  }

  const seekers = [
    {
      name: 'Frederick Community Kitchen',
      ein: '52-1234567',
      city: 'Frederick',
      mission:
        'To nourish our neighbors and build a stronger, more connected community through food.',
      profile: {
        servesWho:
          'Adults and families in the City of Frederick who are food insecure, most arriving as walk-ins or referred by the county Department of Social Services. Roughly 400 households a month.',
        doesWhat:
          'Runs a hot lunch service five days a week and a Saturday grocery pantry. Also does benefits screening for SNAP at the point of service.',
        doesNotDo:
          'Does not provide shelter, housing placement, medical care, or addiction treatment. Does not deliver meals to homes.',
        doesNotServe:
          'Does not serve outside the City of Frederick, and does not run programs specific to children or seniors.',
        populations: ['food-insecure adults', 'low-income families'],
        serviceAreas: ['City of Frederick, MD'],
        programAreas: ['food security', 'public benefits access'],
        outcomes: 'Served 61,000 meals last fiscal year; enrolled 340 households in SNAP.',
        yearFounded: 2009,
        annualBudget: 780_000,
        staffCount: 6,
        volunteerCount: 140,
        interviewComplete: true,
      },
      // Established since 2009 with a real budget, so its filings are in order.
      // Without at least one fully-documented seeker, every match in the system
      // is correctly blocked on paperwork and the engine looks broken - it is
      // the compliance dimension doing its job, but nothing else gets to show.
      compliance: {
        FORM_990: { status: 'VERIFIED', periodLabel: 'FY2025' },
        GOOD_STANDING: { status: 'VERIFIED', periodLabel: 'Expires 2027-04-30' },
        IRS_DETERMINATION: { status: 'VERIFIED', periodLabel: '501(c)(3), 2009' },
      } as Record<string, { status: ComplianceStatus; periodLabel?: string }>,
    },
    {
      name: 'Carroll Creek Youth Arts',
      city: 'Frederick',
      mission: 'Empowering young people through the transformative power of the arts.',
      profile: {
        servesWho: 'Middle and high school students in Frederick County, mostly through school partnerships.',
        doesWhat: 'After-school studio arts and music instruction, plus a summer intensive.',
        populations: ['K-12 students'],
        serviceAreas: ['Frederick County, MD'],
        programAreas: ['arts education', 'youth development'],
        yearFounded: 2016,
        annualBudget: 210_000,
        staffCount: 2,
        volunteerCount: 25,
        interviewComplete: false,
      },
      // Younger and thinner-staffed: 990 filed, good standing lapsed, and the
      // interview unfinished. This is the seeker that demonstrates a blocked
      // match with a fixable reason attached.
      compliance: {
        FORM_990: { status: 'VERIFIED', periodLabel: 'FY2025' },
        GOOD_STANDING: { status: 'EXPIRED', periodLabel: 'Lapsed 2026-03-31' },
        IRS_DETERMINATION: { status: 'VERIFIED', periodLabel: '501(c)(3), 2016' },
      } as Record<string, { status: ComplianceStatus; periodLabel?: string }>,
    },
  ];

  for (const seeker of seekers) {
    const org = await upsertOrg('SEEKER', seeker.name, {
      ein: (seeker as { ein?: string }).ein ?? null,
      city: seeker.city,
      state: 'MD',
      mission: seeker.mission,
    });
    await upsertSeekerProfile(org.id, seeker.profile);
    for (const [type, item] of Object.entries(seeker.compliance)) {
      await upsertComplianceItem(org.id, type as ComplianceType, item);
    }
  }

  const counts = await Promise.all([countOrganizations('DONOR'), countOrganizations('SEEKER')]);
  console.log(`Seeded: ${counts[0]} donors, ${counts[1]} seekers.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
