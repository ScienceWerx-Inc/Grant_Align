import Link from 'next/link';

/**
 * Shell for the working application: CRM, research, matching.
 *
 * A route group rather than a path segment, so these pages keep their URLs
 * (/seekers, /donors, /matches) while the marketing landing page keeps `/` and
 * its own chrome. Nothing in this nav belongs on a page aimed at someone who
 * has not signed up yet.
 */

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/seekers', label: 'Grant seekers' },
  { href: '/donors', label: 'Grant givers' },
  { href: '/matches', label: 'Matches' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="no-print sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Grant<span className="text-brand">Align</span>
          </Link>
          <nav className="flex gap-1">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted transition hover:bg-surface hover:text-ink"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="ml-auto hidden text-xs text-muted sm:block">
            Frederick County, MD · prototype
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
