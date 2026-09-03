/**
 * Wraps the donor research flow in a persisted ResearchRun.
 *
 * A run row is written before the network calls start and updated when they
 * finish, so a refresh that dies mid-flight is visible as RUNNING rather than
 * vanishing. Proposed criteria land in `extracted` and wait for a person to
 * accept them (see `acceptResearch`) — the scraper never edits a live profile.
 */

import { prisma } from '@/lib/db';
import { researchDonor, type DonorResearchResult } from '@/ai/flows/researchDonor';
import { toCount } from '@/ai/coerce';

export async function refreshDonor(orgId: string, triggeredBy: 'manual' | 'cron') {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const locality = [org.city, org.state].filter(Boolean).join(', ') || 'Frederick County, Maryland';

  const run = await prisma.researchRun.create({
    data: {
      orgId,
      source: org.website ? `${org.website} + web search` : 'web search',
      triggeredBy,
    },
  });

  try {
    const result: DonorResearchResult = await researchDonor({
      name: org.name,
      website: org.website ?? null,
      locality,
    });

    await prisma.researchRun.update({
      where: { id: run.id },
      data: {
        status: result.criteria ? 'SUCCESS' : 'FAILED',
        grounded: result.grounded,
        dossier: result.dossier || null,
        sources: result.sources as unknown as object,
        extracted: (result.criteria ?? undefined) as unknown as object | undefined,
        error: result.error ?? (result.criteria ? null : 'No criteria could be extracted.'),
        finishedAt: new Date(),
      },
    });

    // Stamp the attempt even when nothing was extracted, so the donor list can
    // distinguish "never researched" from "researched and came back empty".
    await prisma.donorProfile.upsert({
      where: { orgId },
      create: { orgId, lastResearchedAt: new Date(), researchGrounded: result.grounded },
      update: { lastResearchedAt: new Date(), researchGrounded: result.grounded },
    });

    return { runId: run.id, ok: Boolean(result.criteria), error: result.error };
  } catch (err: any) {
    await prisma.researchRun.update({
      where: { id: run.id },
      data: { status: 'FAILED', error: err?.message ?? 'Research failed.', finishedAt: new Date() },
    });
    return { runId: run.id, ok: false, error: err?.message ?? 'Research failed.' };
  }
}

/**
 * Writes a research run's proposed criteria onto the donor's live profile.
 *
 * Deliberately NOT a server action, and deliberately not calling
 * `revalidatePath`: scripts (`npm run demo`) accept runs outside any request,
 * where revalidation throws "static generation store missing" and takes the
 * write down with it. The server action in src/lib/actions.ts wraps this and
 * revalidates; everything else calls it directly.
 */
export async function acceptResearchRun(runId: string): Promise<string> {
  const run = await prisma.researchRun.findUniqueOrThrow({ where: { id: runId } });
  const criteria = run.extracted as Record<string, any> | null;
  if (!criteria) throw new Error('This run produced no criteria to accept.');

  const deadline = criteria.nextDeadline ? new Date(criteria.nextDeadline) : null;

  const data = {
    fundingFocus: asStrings(criteria.fundingFocus),
    excludedSectors: asStrings(criteria.excludedSectors),
    populationsServed: asStrings(criteria.populationsServed),
    geographies: asStrings(criteria.geographies),
    grantMin: toCount(criteria.grantMin) ?? null,
    grantMax: toCount(criteria.grantMax) ?? null,
    cycleNotes: asText(criteria.cycleNotes),
    nextDeadline: deadline && !Number.isNaN(deadline.getTime()) ? deadline : null,
    applicationPortal: asText(criteria.applicationPortal),
    applicationUrl: asText(criteria.applicationUrl),
    requiresLoi: criteria.requiresLoi === true,
    requires990: criteria.requires990 !== false,
    requiresGoodStanding: criteria.requiresGoodStanding !== false,
    givingNotes: asText(criteria.givingNotes),
    lastResearchedAt: run.finishedAt ?? new Date(),
    researchGrounded: run.grounded,
  };

  await prisma.donorProfile.upsert({
    where: { orgId: run.orgId },
    create: { orgId: run.orgId, ...data },
    update: data,
  });

  return run.orgId;
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function asText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : text;
}
