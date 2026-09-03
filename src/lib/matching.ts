/**
 * Runs the matching engine over pairs and persists the results.
 *
 * A candidate filter runs before the model: with a few hundred seekers and a
 * few dozen donors, scoring every pair on every refresh would be slow and
 * mostly wasted. Pairs are only sent to the model when there is a plausible
 * reason to evaluate them; everything else is recorded as an un-scored skip
 * with the reason, so the UI can still show why a donor never appeared.
 */

import { prisma } from '@/lib/db';
import { renderDonorProfile, renderSeekerProfile, type DonorRecord, type SeekerRecord } from '@/lib/profile-text';
import { reconcileVerdict, scoreMatch, weightedScore } from '@/ai/flows/scoreMatch';
import type { MatchVerdict } from '@prisma/client';

const SEEKER_INCLUDE = { seekerProfile: true, contacts: true, compliance: true } as const;
const DONOR_INCLUDE = { donorProfile: true, contacts: true } as const;

export interface RunProgress {
  /** 1-based index of the pair just finished. */
  index: number;
  total: number;
  outcome: PairOutcome;
}

export interface PairOutcome {
  seekerId: string;
  donorId: string;
  seekerName: string;
  donorName: string;
  score: number;
  verdict: MatchVerdict;
  skippedReason?: string;
}

/**
 * Whether a pair is worth spending a model call on. Deliberately permissive:
 * this is a cost filter, not a second scorer, and the engine's whole value is
 * catching fits a keyword filter would miss.
 */
function worthScoring(seeker: SeekerRecord, donor: DonorRecord): { ok: true } | { ok: false; reason: string } {
  const profile = seeker.seekerProfile;
  if (!profile || (!profile.servesWho && !profile.doesWhat && !seeker.mission)) {
    return { ok: false, reason: 'Seeker profile is empty — run the AI interview first.' };
  }
  const donorProfile = donor.donorProfile;
  const hasCriteria =
    donorProfile &&
    (donorProfile.fundingFocus.length > 0 ||
      donorProfile.excludedSectors.length > 0 ||
      donorProfile.givingNotes ||
      donorProfile.cycleNotes ||
      donor.mission);
  if (!hasCriteria) {
    return { ok: false, reason: 'Donor criteria are empty — run a research pass or the donor interview first.' };
  }
  return { ok: true };
}

async function scorePair(seeker: SeekerRecord, donor: DonorRecord): Promise<PairOutcome> {
  const gate = worthScoring(seeker, donor);
  if (!gate.ok) {
    return {
      seekerId: seeker.id,
      donorId: donor.id,
      seekerName: seeker.name,
      donorName: donor.name,
      score: 0,
      verdict: 'SKIP',
      skippedReason: gate.reason,
    };
  }

  const result = await scoreMatch({
    seekerName: seeker.name,
    seekerProfile: renderSeekerProfile(seeker),
    donorName: donor.name,
    donorProfile: renderDonorProfile(donor),
  });

  const score = weightedScore(result.dimensions);
  const verdict = reconcileVerdict(score, result.blockers, result.verdict);

  const data = {
    score,
    verdict,
    headline: result.headline,
    rationale: result.rationale,
    dimensions: result.dimensions as unknown as object,
    alignments: result.alignments,
    gaps: result.gaps,
    blockers: result.blockers,
    computedAt: new Date(),
  };

  await prisma.match.upsert({
    where: { seekerOrgId_donorOrgId: { seekerOrgId: seeker.id, donorOrgId: donor.id } },
    create: { seekerOrgId: seeker.id, donorOrgId: donor.id, ...data },
    update: data,
  });

  return {
    seekerId: seeker.id,
    donorId: donor.id,
    seekerName: seeker.name,
    donorName: donor.name,
    score,
    verdict,
  };
}

/**
 * Scores pairs sequentially. The Gemini free tier rate-limits hard enough that
 * a parallel fan-out over a full donor list fails most of its calls, and a slow
 * complete run beats a fast half-empty one.
 */
export async function runMatches(
  opts: { seekerId?: string; donorId?: string },
  /**
   * Called as each pair finishes, so a caller can report progress while the run
   * is still going. A full re-run is minutes long on a rate-limited key, and a
   * button that says "Scoring..." for four minutes is indistinguishable from
   * one that has hung.
   */
  onProgress?: (progress: RunProgress) => void | Promise<void>,
): Promise<PairOutcome[]> {
  const seekers = (await prisma.organization.findMany({
    where: { kind: 'SEEKER', ...(opts.seekerId ? { id: opts.seekerId } : {}) },
    include: SEEKER_INCLUDE,
    orderBy: { name: 'asc' },
  })) as SeekerRecord[];

  const donors = (await prisma.organization.findMany({
    where: { kind: 'DONOR', ...(opts.donorId ? { id: opts.donorId } : {}) },
    include: DONOR_INCLUDE,
    orderBy: { name: 'asc' },
  })) as DonorRecord[];

  const outcomes: PairOutcome[] = [];
  const total = seekers.length * donors.length;

  for (const seeker of seekers) {
    for (const donor of donors) {
      let outcome: PairOutcome;
      try {
        outcome = await scorePair(seeker, donor);
      } catch (err: any) {
        outcome = {
          seekerId: seeker.id,
          donorId: donor.id,
          seekerName: seeker.name,
          donorName: donor.name,
          score: 0,
          verdict: 'SKIP',
          skippedReason: err?.message ?? 'Scoring failed.',
        };
      }

      outcomes.push(outcome);
      // Each scored pair is already persisted by scorePair, so progress
      // survives the request being cut short - a run that hits a function
      // timeout keeps everything it finished, and re-running resumes the rest.
      await onProgress?.({ index: outcomes.length, total, outcome });
    }
  }

  return outcomes;
}
