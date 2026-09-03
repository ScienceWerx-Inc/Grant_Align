import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Grant Align — grant matching for Frederick County',
  description:
    'Matches local non-profits to regional funders on what they actually do, and explicitly do not do, rather than on mission-statement language.',
};

/**
 * Root layout deliberately carries no navigation: the landing page and the
 * application want different chrome, and each supplies its own.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
