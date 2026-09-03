import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { signOut } from '@/lib/auth-actions';

/**
 * Shell for the working application: CRM, research, matching.
 *
 * A route group rather than a path segment, so these pages keep their URLs
 * (/seekers, /donors, /matches) while the marketing landing page keeps `/` and
 * its own chrome. Nothing in this nav belongs on a page aimed at someone who
 * has not signed up yet.
 */

/**
 * Navigation is per-role, not decoration.
 *
 * A seeker has no use for a list of every other non-profit, and showing a link
 * that leads to /no-access is worse than not showing it. The links a role gets
 * mirror what src/lib/auth.ts will actually let it load.
 */
const STAFF_NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/seekers', label: 'Grant seekers' },
  { href: '/donors', label: 'Grant givers' },
  { href: '/matches', label: 'Matches' },
  { href: '/staff/people', label: 'People' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav =
    user.role === 'STAFF'
      ? STAFF_NAV
      : user.orgId
        ? [
            {
              href: user.role === 'SEEKER' ? `/seekers/${user.orgId}` : `/donors/${user.orgId}`,
              label: user.role === 'SEEKER' ? 'My organization' : 'My foundation',
            },
            { href: '/matches', label: 'Matches' },
          ]
        : [{ href: '/onboarding', label: 'Finish setup' }];

  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Grant<span className="text-brand">Align</span>
          </Link>
          <nav className="flex gap-1">
            {nav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-xs text-muted sm:block">
              {user.org?.name ?? (user.role === 'STAFF' ? 'Staff' : 'No organization')}
            </span>
            <form action={signOut}>
              <button type="submit" className="btn-ghost px-2.5 py-1.5 text-xs">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
