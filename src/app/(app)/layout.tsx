import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';

/**
 * Shell for the working application.
 *
 * `requireUser` here means no app page renders for a signed-out visitor even if
 * middleware were bypassed. It is not sufficient on its own though: this only
 * establishes that someone is signed in, and each page still has to check that
 * this particular user may see the specific organization being requested.
 *
 * The nav is built from the role, so a seeker is never shown a link to the
 * list of every other non-profit - a link they would only get a redirect from.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  const nav =
    user.role === 'STAFF'
      ? [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/seekers', label: 'Grant seekers' },
          { href: '/donors', label: 'Grant givers' },
          { href: '/matches', label: 'Matches' },
        ]
      : user.role === 'SEEKER'
        ? [
            { href: user.orgId ? `/seekers/${user.orgId}` : '/onboarding', label: 'My organization' },
            { href: '/matches', label: 'My matches' },
          ]
        : [
            { href: user.orgId ? `/donors/${user.orgId}` : '/onboarding', label: 'Our foundation' },
            { href: '/matches', label: 'Matching non-profits' },
          ];

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
          <div className="ml-auto">
            <UserMenu email={user.email} role={user.role} orgName={user.org?.name ?? null} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
