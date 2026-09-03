/**
 * Prepares a demo-ready database: researches real donor criteria, accepts them,
 * and scores every seeker against every donor.
 *
 *   npm run demo            # research 3 donors, then match
 *   npm run demo -- 5       # research 5
 *
 * Why this exists: a fresh seed has nine donors with no criteria, so the
 * matching engine correctly refuses to score anything and the app looks empty.
 * Rather than shipping invented criteria for real local foundations - which
 * would put fabricated giving rules under a real organization's name, in a demo
 * where nobody can tell - this runs the actual research pipeline against their
 * live sites and uses what comes back.
 *
 * It auto-accepts research proposals, which the app deliberately does not do.
 * That is a demo-setup shortcut, not the product behaviour: in the UI a person
 * reviews each proposal before it becomes a donor's live criteria.
 *
 * Requires DATABASE_URL and GEMINI_API_KEY. Costs roughly 2 model calls per
 * donor plus one per seeker/donor pair, and takes a few minutes.
 */

import { prisma } from '@/lib/db';
import { aiConfigured, AI_KEY_VAR, AI_PROVIDER } from '@/ai/providers';
import { refreshDonor } from '@/lib/donor-refresh';
import { acceptResearchRun } from '@/lib/donor-refresh';
import { runMatches } from '@/lib/matching';

const DEFAULT_DONOR_COUNT = 3;

/**
 * Pause between donors.
 *
 * Each donor costs a web search plus an extraction pass, and a search response
 * carries a lot of tokens. Free-tier keys meter tokens per minute, so running
 * donors back to back exhausts the window around the fourth one and every
 * remaining donor fails - which looks like broken research rather than a quota
 * ceiling. Waiting between them is slower and finishes; not waiting is faster
 * and does not.
 */
const PAUSE_BETWEEN_DONORS_MS = Number(process.env.DEMO_PAUSE_MS ?? 20_000);

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function heading(text: string) {
  console.log(`\n${'='.repeat(72)}\n${text}\n${'='.repeat(72)}`);
}

async function main() {
  if (!aiConfigured) {
    console.error(`${AI_KEY_VAR} is not set (AI_PROVIDER=${AI_PROVIDER}). Add it to .env and re-run.`);
    process.exit(1);
  }

  const requested = Number(process.argv[2]);
  const donorCount = Number.isFinite(requested) && requested > 0 ? requested : DEFAULT_DONOR_COUNT;

  const seekers = await prisma.organization.count({ where: { kind: 'SEEKER' } });
  if (seekers === 0) {
    console.error('No seekers in the database. Run `npm run db:seed` first.');
    process.exit(1);
  }

  // Donors with a website first: those are the ones the scraper can actually
  // read directly, so they produce the most convincing demo.
  const donors = await prisma.organization.findMany({
    where: { kind: 'DONOR' },
    orderBy: [{ website: { sort: 'asc', nulls: 'last' } }, { name: 'asc' }],
    take: donorCount,
  });

  heading(`Researching ${donors.length} donor(s)`);
  let accepted = 0;
  const failed: string[] = [];

  for (const [index, donor] of donors.entries()) {
    if (index > 0 && PAUSE_BETWEEN_DONORS_MS > 0) await sleep(PAUSE_BETWEEN_DONORS_MS);
    process.stdout.write(`  ${donor.name} … `);
    const result = await refreshDonor(donor.id, 'manual');
    if (!result.ok) {
      console.log(`no criteria (${result.error ?? 'unknown'})`);
      failed.push(donor.name);
      continue;
    }
    try {
      await acceptResearchRun(result.runId);
      accepted += 1;
      const profile = await prisma.donorProfile.findUnique({ where: { orgId: donor.id } });
      console.log(
        `accepted — funds: ${profile?.fundingFocus.slice(0, 3).join(', ') || 'unstated'}` +
          ` | excludes: ${profile?.excludedSectors.length ?? 0} item(s)`,
      );
    } catch (err: any) {
      console.log(`proposed but not accepted: ${err?.message}`);
      failed.push(donor.name);
    }
  }

  if (failed.length > 0) {
    console.log(`\n  ${failed.length} donor(s) produced nothing: ${failed.join(', ')}`);
    console.log('  Re-running the demo picks these up first, since they stay marked unresearched.');
  }

  if (accepted === 0) {
    console.error('\nNo donor criteria could be established, so matching would score nothing.');
    console.error(
      AI_PROVIDER === 'gemini'
        ? 'Check that Google Search grounding is enabled on the API key.'
        : 'On Mistral there is no web search, so research depends entirely on the funder\'s own site being fetchable. Try donors with a readable public site, or switch to AI_PROVIDER=gemini.',
    );
    process.exit(1);
  }

  heading('Scoring matches');
  const outcomes = await runMatches({});
  const scored = outcomes.filter(o => !o.skippedReason);
  const byVerdict = {
    APPLY: scored.filter(o => o.verdict === 'APPLY'),
    MAYBE: scored.filter(o => o.verdict === 'MAYBE'),
    SKIP: scored.filter(o => o.verdict === 'SKIP'),
  };

  for (const outcome of scored.sort((a, b) => b.score - a.score)) {
    console.log(
      `  ${String(outcome.score).padStart(3)}  ${outcome.verdict.padEnd(5)}  ` +
        `${outcome.seekerName} -> ${outcome.donorName}`,
    );
  }
  const skipped = outcomes.filter(o => o.skippedReason);
  if (skipped.length > 0) {
    console.log(`\n  ${skipped.length} pair(s) not scored (donor criteria still empty):`);
    for (const outcome of skipped.slice(0, 5)) {
      console.log(`    ${outcome.donorName}: ${outcome.skippedReason}`);
    }
  }

  heading('Ready to demo');
  console.log(`Donors researched: ${accepted}/${donors.length}`);
  console.log(
    `Pairs scored: ${scored.length} ` +
      `(${byVerdict.APPLY.length} apply, ${byVerdict.MAYBE.length} worth a look, ${byVerdict.SKIP.length} skip)`,
  );
  console.log('\nSuggested walkthrough:');
  console.log('  1. /                     the dashboard, strongest matches up top');
  console.log('  2. /donors/<researched>  research history, sources, accepted criteria');
  console.log('  3. /seekers/<seeker>     the AI interviewer, live, in the right column');
  console.log('  4. /matches              per-dimension scoring and the blockers');
  console.log('  5. /seekers/<seeker>/one-pager   generate, then print to letterhead');

  await prisma.$disconnect();
}

void main();
