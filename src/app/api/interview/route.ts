import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { interviewTurn, type InterviewMessage } from '@/ai/flows/interviewer';
import { applyInterviewExtraction } from '@/lib/actions';
import { renderDonorProfile, renderSeekerProfile, type DonorRecord, type SeekerRecord } from '@/lib/profile-text';
import { aiConfigured, AI_KEY_VAR } from '@/ai/providers';
import { canAccessOrg, getSessionUser } from '@/lib/auth';

export const maxDuration = 60;

/**
 * One interviewer turn: append the respondent's answer, ask the model for the
 * next question, persist both the transcript and whatever it extracted.
 *
 * Extraction is written on every turn rather than at the end. Interviews get
 * abandoned halfway, and a half-filled profile is worth keeping.
 */
export async function POST(request: Request) {
  if (!aiConfigured) {
    return NextResponse.json(
      { error: `${AI_KEY_VAR} is not set, so the AI interviewer is unavailable.` },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { orgId?: string; answer?: string; sessionId?: string };
  if (!body.orgId) return NextResponse.json({ error: 'orgId is required.' }, { status: 400 });

  // Page guards do nothing for a route handler: this endpoint is reachable
  // directly with any orgId, so it has to make its own decision.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!canAccessOrg(user, body.orgId)) {
    return NextResponse.json({ error: 'Not authorized for that organization.' }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: body.orgId },
    include: { seekerProfile: true, donorProfile: true, contacts: true, compliance: true },
  });
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const role = org.kind;
  const context =
    role === 'SEEKER'
      ? renderSeekerProfile(org as unknown as SeekerRecord)
      : renderDonorProfile(org as unknown as DonorRecord);

  let session = body.sessionId
    ? await prisma.interviewSession.findUnique({ where: { id: body.sessionId } })
    : await prisma.interviewSession.findFirst({
        where: { orgId: org.id, role, status: 'IN_PROGRESS' },
        orderBy: { updatedAt: 'desc' },
      });

  if (!session) {
    session = await prisma.interviewSession.create({ data: { orgId: org.id, role } });
  }

  const messages = (session.messages as unknown as InterviewMessage[]) ?? [];
  if (body.answer?.trim()) {
    messages.push({ role: 'user', content: body.answer.trim(), at: new Date().toISOString() });
  }

  const turn = await interviewTurn({
    role,
    orgName: org.name,
    context,
    messages,
    extracted: {},
  });

  messages.push({ role: 'assistant', content: turn.reply, at: new Date().toISOString() });

  const extracted = (turn.extracted ?? {}) as Record<string, unknown>;
  await applyInterviewExtraction(org.id, role, extracted, turn.done);

  await prisma.interviewSession.update({
    where: { id: session.id },
    data: {
      messages: messages as unknown as object,
      status: turn.done ? 'COMPLETE' : 'IN_PROGRESS',
      summary: turn.summary ?? undefined,
    },
  });

  return NextResponse.json({
    sessionId: session.id,
    reply: turn.reply,
    coverage: turn.coverage,
    done: turn.done,
    extracted,
  });
}
