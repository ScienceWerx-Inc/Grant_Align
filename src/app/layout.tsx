import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grant Align — Frederick County grant matcher',
  description:
    'Matches local non-profits to regional funders on operational reality rather than mission-statement language.',
};

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/seekers', label: 'Grant seekers' },
  { href: '/donors', label: 'Grant givers' },
  { href: '/matches', label: 'Matches' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="no-print border-b border-line bg-white">
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
            <span className="ml-auto text-xs text-muted">Frederick County, MD · prototype</span>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
