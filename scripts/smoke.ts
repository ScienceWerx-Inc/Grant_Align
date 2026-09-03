/**
 * End-to-end exercise of every AI flow, against a live Gemini key.
 *
 * The four flows are the parts of this system that cannot be verified by a type
 * check or a page render: prompt bugs, schema mismatches and grounding failures
 * only surface on a real call. This runs each one once, against real seed data,
 * and reports what came back — so a broken prompt is caught here rather than by
 * a non-profit halfway through an interview.
 *
 *   npm run smoke            # all four flows
 *   npm run smoke interview  # just one (interview | research | match | onepager)
 *
 * Requires DATABASE_URL and GEMINI_API_KEY. Costs a handful of model calls.
 */

import { prisma } from '@/lib/db';
import { aiConfigured } from '@/ai/providers';
import { interviewTurn, type InterviewMessage } from '@/ai/flows/interviewer';
import { researchDonor } from '@/ai/flows/researchDonor';
import { scoreMatch, reconcileVerdict, weightedScore } from '@/ai/flows/scoreMatch';
import { generateOnePager } from '@/ai/flows/onePager';
import {
  renderDonorProfile,
  renderSeekerProfile,
  type DonorRecord,
  type SeekerRecord,
} from '@/lib/profile-text';

const SEEKER_INCLUDE = { seekerProfile: true, contacts: true, compliance: true } as const;

function heading(text: string) {
  console.log(`\n${'─'.repeat(70)}\n${text}\n${'─'.repeat(70)}`);
}

function truncate(text: string, max = 400): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

async function seekerFixture(): Promise<SeekerRecord> {
  // The seeded Community Kitchen has a full profile including both "does NOT"
  // fields, which is what makes it a meaningful test of scoring and the
  // 1-pager. Any interviewed seeker will do if the seed has been changed.
  const org = await prisma.organization.findFirst({
    where: { kind: 'SEEKER', seekerProfile: { interviewComplete: true } },
    include: SEEKER_INCLUDE,
  });
  if (!org) throw new Error('No interviewed seeker found. Run `npm run db:seed` first.');
  return org as SeekerRecord;
}

async function testInterview() {
  heading('1. AI interviewer (seeker)');
  const org = await prisma.organization.findFirst({
    where: { kind: 'SEEKER' },
    include: SEEKER_INCLUDE,
  });
  if (!org) throw new Error('No seeker found. Run `npm run db:seed` first.');

  const messages: InterviewMessage[] = [];

  const opening = await interviewTurn({
    role: 'SEEKER',
    orgName: org.name,
    context: renderSeekerProfile(org as SeekerRecord),
    messages,
    extracted: {},
  });
  console.log(`Q1: ${opening.reply}`);
  messages.push({ role: 'assistant', content: opening.reply });

  // A deliberately vague answer: a working interviewer pushes back on this
  // rather than accepting it and moving to the next agenda item.
  const vague = 'We serve the community and try to help wherever we can.';
  messages.push({ role: 'user', content: vague });
  console.log(`A1 (deliberately vague): ${vague}`);

  const followUp = await interviewTurn({
    role: 'SEEKER',
    orgName: org.name,
    context: renderSeekerProfile(org as SeekerRecord),
    messages,
    extracted: opening.seeker ?? {},
  });
  console.log(`Q2: ${followUp.reply}`);
  console.log(`covered: ${followUp.coverage.join(', ') || '(none yet)'} | done: ${followUp.done}`);
  console.log(`extracted: ${JSON.stringify(followUp.seeker ?? {})}`);

  if (followUp.done) console.warn('⚠  Declared done after one vague answer — agenda is too easy to satisfy.');
  console.log('✓ interviewer responded with structured output');
}

async function testResearch() {
  heading('2. Donor research (live fetch + grounded search)');
  const org = await prisma.organization.findFirst({
    where: { kind: 'DONOR', website: { not: null } },
  });
  if (!org) throw new Error('No donor with a website found. Run `npm run db:seed` first.');

  console.log(`Researching ${org.name} (${org.website})…`);
  const result = await researchDonor({
    name: org.name,
    website: org.website,
    locality: [org.city, org.state].filter(Boolean).join(', '),
  });

  console.log(`grounded: ${result.grounded} | pages fetched: ${result.fetchedUrls.length} | sources: ${result.sources.length}`);
  if (result.error) console.log(`note: ${result.error}`);
  console.log(`dossier: ${truncate(result.dossier, 300)}`);
  if (!result.criteria) {
    console.warn('⚠  No criteria extracted.');
    return;
  }
  console.log(`criteria: ${JSON.stringify(result.criteria, null, 2)}`);
  console.log('✓ research returned structured criteria');
}

async function testMatch() {
  heading('3. Matching engine');
  const seeker = await seekerFixture();
  const donor = (await prisma.organization.findFirst({
    where: { kind: 'DONOR' },
    include: { donorProfile: true, contacts: true },
    orderBy: { donorProfile: { lastResearchedAt: 'desc' } },
  })) as DonorRecord | null;
  if (!donor) throw new Error('No donor found. Run `npm run db:seed` first.');

  console.log(`${seeker.name} → ${donor.name}`);
  const result = await scoreMatch({
    seekerName: seeker.name,
    seekerProfile: renderSeekerProfile(seeker),
    donorName: donor.name,
    donorProfile: renderDonorProfile(donor),
  });

  const score = weightedScore(result.dimensions);
  const verdict = reconcileVerdict(score, result.blockers, result.verdict);
  console.log(`score ${score} | model verdict ${result.verdict} → reconciled ${verdict}`);
  console.log(`headline: ${result.headline}`);
  console.log(`rationale: ${result.rationale}`);
  for (const dimension of result.dimensions) {
    console.log(`  ${dimension.key.padEnd(11)} ${String(dimension.score).padStart(3)}  ${dimension.note}`);
  }
  if (result.blockers.length) console.log(`blockers: ${result.blockers.join('; ')}`);
  console.log('✓ engine returned all six dimensions');
}

async function testOnePager() {
  heading('4. 1-pager generator');
  const seeker = await seekerFixture();
  const sheet = await generateOnePager({
    orgName: seeker.name,
    profile: renderSeekerProfile(seeker),
  });

  console.log(`${sheet.organizationName} — ${sheet.tagline}`);
  console.log(`\n${sheet.overview}`);
  console.log(`\nWHO WE SERVE\n${sheet.whoWeServe}`);
  console.log(`\nSCOPE\n${sheet.scope}`);
  console.log(`\nIMPACT\n${sheet.impact.map(i => `• ${i}`).join('\n')}`);
  console.log(`\nAT A GLANCE\n${sheet.quickFacts.map(f => `${f.label}: ${f.value}`).join('\n')}`);
  if (sheet.omissions.length) console.log(`\nomissions: ${sheet.omissions.join('; ')}`);

  // The one failure mode that matters here: a sheet goes out under the
  // organization's name, so an invented number is worse than a missing one.
  const budget = seeker.seekerProfile?.annualBudget;
  if (budget) {
    const rendered = JSON.stringify(sheet);
    const stated = budget.toLocaleString('en-US');
    if (!rendered.includes(stated) && /\$[\d,]{4,}/.test(rendered)) {
      console.warn(`⚠  Sheet contains a dollar figure that is not the profile's budget ($${stated}) — check for invention.`);
    }
  }
  console.log('\n✓ 1-pager compiled');
}

const TESTS: Record<string, () => Promise<void>> = {
  interview: testInterview,
  research: testResearch,
  match: testMatch,
  onepager: testOnePager,
};

async function main() {
  if (!aiConfigured) {
    console.error('GEMINI_API_KEY is not set. Add it to .env and re-run.');
    process.exit(1);
  }

  const requested = process.argv.slice(2).filter(arg => arg in TESTS);
  const names = requested.length > 0 ? requested : Object.keys(TESTS);

  const failures: string[] = [];
  for (const name of names) {
    try {
      await TESTS[name]();
    } catch (err: any) {
      failures.push(name);
      console.error(`\n✗ ${name} FAILED: ${err?.message ?? err}`);
      if (err?.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }

  heading(failures.length === 0 ? `All ${names.length} flow(s) passed` : `${failures.length} of ${names.length} failed: ${failures.join(', ')}`);
  await prisma.$disconnect();
  process.exit(failures.length === 0 ? 0 : 1);
}

void main();
