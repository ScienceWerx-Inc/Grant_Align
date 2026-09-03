import { NextResponse } from 'next/server';
import { refreshDonor } from '@/lib/donor-refresh';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';
import { canAccessOrg, getSessionUser } from '@/lib/auth';

// Live page fetches plus two model passes; the default 15s would cut it off.
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!aiConfigured) {
    return NextResponse.json(
      { error: `${AI_KEY_VAR} is not set, so donor research is unavailable.` },
      { status: 503 },
    );
  }
  const { orgId } = (await request.json()) as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });

  // Research spends model quota and rewrites a funder's criteria, so it is
  // limited to staff and to the funder itself.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!canAccessOrg(user, orgId)) {
    return NextResponse.json({ error: 'Not authorized for that organization.' }, { status: 403 });
  }

  const result = await refreshDonor(orgId, 'manual');
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
