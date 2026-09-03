import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser, homePathFor } from '@/lib/auth';

/**
 * Where Supabase sends people after they click an email confirmation link.
 *
 * Exchanges the one-time code for a session, then routes by role so a confirmed
 * user lands in their own workspace rather than on a generic page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login`);

  const user = await getSessionUser();
  return NextResponse.redirect(`${origin}${user ? homePathFor(user) : '/onboarding'}`);
}
