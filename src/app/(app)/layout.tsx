import { requireUser } from '@/lib/auth';
import { UserMenu } from '@/components/UserMenu';
import { AppNav } from '@/components/AppNav';

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
          { href: '/staff/messages', label: 'Messages' },
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
      <AppNav items={nav}>
        <UserMenu email={user.email} role={user.role} orgName={user.org?.name ?? null} />
      </AppNav>
      <main className="mx-auto max-w-page px-6 py-8">{children}</main>
    </>
  );
}
