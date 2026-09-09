import Link from 'next/link';
import { ContactForm } from '@/components/ContactForm';
import { Overline } from '@/components/ui';

export const metadata = {
  title: 'Contact — Grant Align',
  description: 'Get in touch with the Grant Align team about access, a partnership, or a question.',
};

/**
 * The public contact page.
 *
 * Exists because the footer advertised a Contact link that pointed at "#" and
 * scrolled to the top - a promise the site did not keep. Accounts here are
 * created by an administrator rather than self-served, so this is also the
 * only route by which a non-profit or a funder can ask for one.
 */
export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-band">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-5">
          <Link href="/" className="inline-flex min-h-[44px] items-center rounded-control text-h4 font-medium tracking-tight text-ink">
            Grant<span className="text-brand-ink">Align</span>
          </Link>
          <Link href="/login" className="btn-secondary btn-sm">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-6 py-16">
        <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-[1fr_1.3fr] md:gap-16">
          <div>
            <Overline>Contact</Overline>
            <h1 className="mt-4 text-h1 font-medium tracking-tight text-ink">Get in touch</h1>
            <p className="mt-4 text-body text-ink-muted">
              Grant Align serves non-profits and funders in Frederick County and the surrounding
              region.
            </p>
            <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">
              Accounts are created by a platform administrator rather than signed up for, so if you
              work at a non-profit or a foundation and would like access, this is the place to ask.
            </p>
            <p className="mt-4 text-body-sm leading-relaxed text-ink-muted">
              We read everything that arrives here. Please allow a few working days for a reply.
            </p>
          </div>

          <div className="rounded-card border border-line bg-card p-6 shadow-raised md:p-8">
            <ContactForm />
          </div>
        </div>
      </main>

      <footer className="border-t border-line bg-paper px-6 py-8">
        <div className="mx-auto max-w-page text-caption text-ink-muted">
          <Link href="/" className="btn-link inline-flex min-h-[44px] items-center">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}
