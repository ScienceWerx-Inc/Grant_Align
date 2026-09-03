import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every request.
 *
 * Access tokens are short-lived, so without this a session silently expires
 * mid-visit and the user is bounced to the login page while still logged in
 * everywhere else. The refreshed cookies have to be written onto the response
 * that is actually returned, which is why the response object is created first
 * and mutated rather than built at the end.
 *
 * This does NOT authorize anything. It only keeps the session alive; every page
 * and route still makes its own decision through src/lib/auth.ts. Middleware
 * runs on the edge with no database access, so it cannot know a user's role.
 */
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

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and images, whose requests would
    // otherwise each cost a token refresh.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
