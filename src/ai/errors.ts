import { NextResponse } from 'next/server';

/**
 * Turns a failed model call into a response the UI can show.
 *
 * Without this an AI route that throws returns an empty 500, and the browser
 * shows "Unexpected end of JSON input" - which says nothing about whether the
 * provider is throttling, the key is wrong, or the code is broken.
 */
export function aiErrorResponse(label: string, err: unknown) {
  const message = String((err as { message?: unknown })?.message ?? err);
  console.error(`[ai] ${label} failed:`, message);

  if (/RESOURCE_EXHAUSTED|\b429\b|rate.?limit|quota/i.test(message)) {
    return NextResponse.json(
      { error: 'The AI service is at its usage limit right now. Wait a minute and try again.' },
      { status: 503 },
    );
  }
  if (/API key not valid|invalid.?api.?key|unauthori[sz]ed|\b401\b|PERMISSION_DENIED/i.test(message)) {
    return NextResponse.json(
      { error: 'The AI service rejected the configured API key. An administrator needs to check it.' },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: `The ${label} failed. Try again in a moment.` }, { status: 502 });
}
