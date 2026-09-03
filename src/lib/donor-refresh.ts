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
