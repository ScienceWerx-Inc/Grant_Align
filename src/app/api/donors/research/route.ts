import { NextResponse } from 'next/server';
import { refreshDonor } from '@/lib/donor-refresh';
import { aiConfigured } from '@/ai/providers';

// Live page fetches plus two model passes; the default 15s would cut it off.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!aiConfigured) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set, so donor research is unavailable.' },
      { status: 503 },
    );
  }
  const { orgId } = (await request.json()) as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });

  const result = await refreshDonor(orgId, 'manual');
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
