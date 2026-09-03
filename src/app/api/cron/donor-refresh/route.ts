import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { refreshDonor } from '@/lib/donor-refresh';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';

// Vercel caps cron invocations; refreshing the stalest few per run and letting
// the schedule work through the list beats one long job that times out.
export const maxDuration = 300;

/**
 * Reads a positive integer from the environment, falling back on anything
 * unusable.
 *
 * `Number(process.env.X ?? default)` is wrong here and fails silently: an env
 * var declared with an empty value - which is exactly what a dashboard row
 * saved without a value produces - is an empty string, not nullish. It skips
 * the `??`, and `Number('')` is 0. A batch size of 0 makes the cron refresh
 * nothing, report success, and look like it ran.
 */
function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

const BATCH_SIZE = positiveInt(process.env.DONOR_REFRESH_BATCH, 3);
const STALE_AFTER_DAYS = positiveInt(process.env.DONOR_REFRESH_STALE_DAYS, 14);

/**
 * The scheduled scraper (requirements §2.3). Wired up in vercel.json; the
 * interval is configurable there.
 *
 * Vercel Cron sends a bearer token equal to CRON_SECRET. The check also accepts
 * `?secret=` so the job can be triggered by hand while testing, but only when
 * CRON_SECRET is set — an unauthenticated refresh endpoint is a way to burn
 * someone's model quota.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  const header = request.headers.get('authorization');
  if (header === `Bearer ${secret}`) return true;
  return new URL(request.url).searchParams.get('secret') === secret;
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  if (!aiConfigured) {
    return NextResponse.json({ error: `${AI_KEY_VAR} is not set.` }, { status: 503 });
  }

  const cutoff = new Date(Date.now() - STALE_AFTER_DAYS * 86_400_000);
  const donors = await prisma.organization.findMany({
    where: {
      kind: 'DONOR',
      OR: [
        { donorProfile: null },
        { donorProfile: { lastResearchedAt: null } },
        { donorProfile: { lastResearchedAt: { lt: cutoff } } },
      ],
    },
    // Never-researched donors sort first: nulls lead on ascending order here.
    orderBy: { donorProfile: { lastResearchedAt: 'asc' } },
    take: BATCH_SIZE,
  });

  const results = [];
  for (const donor of donors) {
    const result = await refreshDonor(donor.id, 'cron');
    results.push({ donor: donor.name, ...result });
  }

  return NextResponse.json({ refreshed: results.length, staleAfterDays: STALE_AFTER_DAYS, results });
}

export const GET = handle;
export const POST = handle;
