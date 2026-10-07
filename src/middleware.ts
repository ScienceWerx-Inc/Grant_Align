import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * Gates the app routes on the Firebase session cookie.
 *
 * This runs on the edge, where the Admin SDK cannot verify the cookie's
 * signature — so it only checks presence, NOT validity. A missing cookie
 * redirects to login; a present-but-invalid one is treated as signed out by
 * `getSessionUser()` in src/lib/auth.ts, which every page and route handler
 * still has to call. The redirect here is a convenience, NOT the security
 * boundary: middleware cannot know a user's role or organization.
 */

/** Paths reachable without signing in. */
// /api/auth is where a session is created, so it must be reachable without one.
const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/contact', '/auth', '/api/auth', '/no-access'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const { pathname } = request.nextUrl;

  if (!session && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Send them back where they were headed once they are in.
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (session && pathname === '/login') {
    const home = request.nextUrl.clone();
    home.pathname = '/handoff';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets and the cron endpoint, which authenticates
  // with a bearer secret rather than a session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
