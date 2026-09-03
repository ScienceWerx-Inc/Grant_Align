import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request and gates the app routes.
 *
 * Two jobs, and the ordering matters. Server components cannot write cookies,
 * so without this the access token would expire and never refresh, silently
 * signing people out mid-session. The redirect for signed-out visitors is a
 * convenience on top of that, NOT the security boundary: middleware only sees
 * the token, so it cannot know a user's role or organization. Every page and
 * route handler still has to authorize for itself via src/lib/auth.ts.
 */

/** Paths reachable without signing in. */
const PUBLIC_PATHS = ['/', '/login', '/auth', '/no-access'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser rather than getSession: this call is what actually refreshes the
  // token, and it validates it with Supabase instead of trusting the cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Send them back where they were headed once they are in.
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (user && pathname === '/login') {
    const home = request.nextUrl.clone();
    home.pathname = '/handoff';
    home.search = '';
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  // Everything except static assets and the cron endpoint, which authenticates
  // with a bearer secret rather than a session.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
