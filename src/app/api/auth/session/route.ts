import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createSessionCookie, adminAuth } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * Client-side auth handshake. The browser signs in with the Firebase client
 * SDK (email/password, email link, Google, …), POSTs the ID token here, and
 * gets an `__session` cookie the server verifies with the Admin SDK.
 *
 * Used by client components (e.g. sign-out cleanup, OAuth flows). The
 * email/password forms go through server actions in src/lib/auth-actions.ts.
 */
export async function POST(request: NextRequest) {
  let idToken: string | undefined;
  try {
    const body = (await request.json()) as { idToken?: unknown };
    if (typeof body.idToken === 'string') idToken = body.idToken;
  } catch {
    idToken = undefined;
  }
  if (!idToken) return NextResponse.json({ error: 'idToken is required.' }, { status: 400 });

  try {
    const cookie = await createSessionCookie(idToken);
    (await cookies()).set(SESSION_COOKIE_NAME, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 24 * 60 * 60,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid ID token.' }, { status: 401 });
  }
}

export async function DELETE() {
  const store = await cookies();
  const session = store.get(SESSION_COOKIE_NAME)?.value;
  store.delete(SESSION_COOKIE_NAME);
  if (session) {
    try {
      const { verifySessionCookie } = await import('@/lib/firebase-admin');
      const { uid } = await verifySessionCookie(session);
      await adminAuth().revokeRefreshTokens(uid);
    } catch {
      // Already invalid; nothing to revoke.
    }
  }
  return NextResponse.json({ ok: true });
}
