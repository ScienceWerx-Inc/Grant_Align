import { redirect } from 'next/navigation';
import { homePathFor, requireUser } from '@/lib/auth';

/**
 * Sends a freshly signed-in user wherever their role belongs.
 *
 * A separate route because the client cannot work this out: it depends on the
 * AppUser row, and putting that logic in the browser would mean shipping the
 * role model to it. The client always navigates here and the server decides.
 */
export default async function HandoffPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [user, { next }] = await Promise.all([requireUser(), searchParams]);

  // Honour the originally requested path, but only when it is a local path -
  // an open redirect here would hand someone's session to another site.
  if (next && next.startsWith('/') && !next.startsWith('//')) redirect(next);

  redirect(homePathFor(user));
}
