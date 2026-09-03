import type { Metadata } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/*
 * The reference calls for Aeonik and Input, both licensed. Inter and IBM Plex
 * Mono are the substitutes it names, and they carry the same qualities that
 * matter here: Inter has the ss01/cv11 alternates the reference switches on,
 * and Plex Mono gives labels the utilitarian tone Input provides.
 */
const aeonik = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-aeonik',
  display: 'swap',
});

const input = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-input',
  display: 'swap',
});

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
    <html lang="en" className={`${aeonik.variable} ${input.variable}`}>
      <body>{children}</body>
    </html>
  );
}
