import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateOnePager } from '@/ai/flows/onePager';
import { renderSeekerProfile, type SeekerRecord } from '@/lib/profile-text';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';

export const maxDuration = 90;

export async function POST(request: Request) {
  if (!aiConfigured) {
    return NextResponse.json(
      { error: `${AI_KEY_VAR} is not set, so the 1-pager generator is unavailable.` },
      { status: 503 },
    );
  }
  const { orgId } = (await request.json()) as { orgId?: string };
  if (!orgId) return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { seekerProfile: true, contacts: true, compliance: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const onePager = await generateOnePager({
    orgName: org.name,
    profile: renderSeekerProfile(org as unknown as SeekerRecord),
  });
  return NextResponse.json(onePager);
}
