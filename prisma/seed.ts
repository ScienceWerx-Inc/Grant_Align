/**
 * Seeds the prepopulated local donors from requirements §2.3, plus two sample
 * seekers so the matching engine has something to evaluate on a fresh install.
 *
 * Donor criteria are deliberately left thin here — a name, a website, a note on
 * what is publicly known. Filling them in is the scraper's and the donor
 * interviewer's job, and pre-writing plausible criteria would make an empty
 * prototype look researched.
 */

import { PrismaClient, type OrgKind } from '@prisma/client';

const prisma = new PrismaClient();

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
  {
    name: 'Carroll Creek Rotary Club',
    city: 'Frederick',
    notes: 'Service club giving; smaller awards, relationship-driven.',
  },
  {
    name: 'Frederick Noon Rotary Club',
    city: 'Frederick',
    notes: 'Service club giving; smaller awards, relationship-driven.',
  },
];

async function upsertOrg(kind: OrgKind, name: string, data: Record<string, unknown>) {
  const existing = await prisma.organization.findFirst({ where: { kind, name } });
  if (existing) {
    return prisma.organization.update({ where: { id: existing.id }, data });
  }
  return prisma.organization.create({ data: { kind, name, ...data } as any });
}

async function main() {
  for (const donor of SEED_DONORS) {
    const org = await upsertOrg('DONOR', donor.name, {
      website: donor.website ?? null,
      city: donor.city ?? null,
      state: 'MD',
      notes: donor.notes ?? null,
      isSeed: true,
    });
    await prisma.donorProfile.upsert({
      where: { orgId: org.id },
      create: { orgId: org.id, geographies: ['Frederick County, MD'] },
      update: {},
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
    },
  ];

  for (const seeker of seekers) {
    const org = await upsertOrg('SEEKER', seeker.name, {
      ein: seeker.ein ?? null,
      city: seeker.city,
      state: 'MD',
      mission: seeker.mission,
    });
    await prisma.seekerProfile.upsert({
      where: { orgId: org.id },
      create: { orgId: org.id, ...seeker.profile },
      update: seeker.profile,
    });
    for (const type of ['FORM_990', 'GOOD_STANDING', 'IRS_DETERMINATION'] as const) {
      await prisma.complianceItem.upsert({
        where: { orgId_type: { orgId: org.id, type } },
        create: { orgId: org.id, type },
        update: {},
      });
    }
  }

  const counts = await Promise.all([
    prisma.organization.count({ where: { kind: 'DONOR' } }),
    prisma.organization.count({ where: { kind: 'SEEKER' } }),
  ]);
  console.log(`Seeded: ${counts[0]} donors, ${counts[1]} seekers.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
