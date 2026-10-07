import { aiErrorResponse } from '@/ai/errors';
import { NextResponse } from 'next/server';
import { createInterviewSession, findLatestInProgressSession, getInterviewSession, getOrgForInterview, updateInterviewSession } from '@/lib/store';
import { interviewTurn } from '@/ai/flows/interviewer';
import type { ChatMessage } from '@/lib/types';
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

  // Route handlers are a separate entry point from pages: guarding the page
  // that renders the interview would do nothing about a direct POST here.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  if (!canAccessOrg(user, body.orgId)) {
    return NextResponse.json({ error: 'Not permitted for this organization.' }, { status: 403 });
  }

  // Page guards do nothing for a route handler: this endpoint is reachable
  // directly with any orgId, so it has to make its own decision.

  const org = await getOrgForInterview(body.orgId);
  if (!org) return NextResponse.json({ error: 'Organization not found.' }, { status: 404 });

  const role = org.kind;
  const context =
    role === 'SEEKER'
      ? renderSeekerProfile(org as unknown as SeekerRecord)
      : renderDonorProfile(org as unknown as DonorRecord);

  let session = body.sessionId
    ? await getInterviewSession(body.sessionId)
    : await findLatestInProgressSession(org.id, role);

  if (!session) {
    session = await createInterviewSession(org.id, role);
  }

  const stored = (session.messages as unknown as ChatMessage[]) ?? [];
  // Older sessions may lack timestamps; the interviewer requires them.
  const messages: ChatMessage[] = stored.map(m => ({
    role: m.role,
    content: m.content,
    at: m.at ?? new Date().toISOString(),
  }));
  if (body.answer?.trim()) {
    messages.push({ role: 'user', content: body.answer.trim(), at: new Date().toISOString() });
  }

  let turn: Awaited<ReturnType<typeof interviewTurn>>;
  try {
    turn = await interviewTurn({
      role,
      orgName: org.name,
      context,
      messages,
      extracted: {},
    });
  } catch (err) {
    return aiErrorResponse('interviewer', err);
  }

  messages.push({ role: 'assistant', content: turn.reply, at: new Date().toISOString() });

  const extracted = (turn.extracted ?? {}) as Record<string, unknown>;
  await applyInterviewExtraction(org.id, role, extracted, turn.done);

  await updateInterviewSession(session.id, {
    messages,
    status: turn.done ? 'COMPLETE' : 'IN_PROGRESS',
    summary: turn.summary ?? undefined,
  });

  return NextResponse.json({
    sessionId: session.id,
    reply: turn.reply,
    coverage: turn.coverage,
    done: turn.done,
    extracted,
  });
}
