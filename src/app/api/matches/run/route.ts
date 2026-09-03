import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { runMatches } from '@/lib/matching';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!aiConfigured) {
    return NextResponse.json(
      { error: `${AI_KEY_VAR} is not set, so the matching engine is unavailable.` },
      { status: 503 },
    );
  }
  const { seekerId, donorId } = (await request.json()) as { seekerId?: string; donorId?: string };
  const outcomes = await runMatches({ seekerId, donorId });

  revalidatePath('/matches');
  if (seekerId) revalidatePath(`/seekers/${seekerId}`);
  if (donorId) revalidatePath(`/donors/${donorId}`);

  return NextResponse.json({
    evaluated: outcomes.filter(o => !o.skippedReason).length,
    skipped: outcomes.filter(o => o.skippedReason),
    outcomes,
  });
}
