import Link from 'next/link';
import { Overline } from '@/components/ui';

/**
 * The frame around every signed-out screen.
 *
 * Sign-in and sign-up were previously built on two different design systems -
 * one dark, one light - which meant the same flow changed visual language
 * halfway through. They share this shell now, so the change of palette happens
 * once, at the point where the product stops selling and starts working.
 *
 * A band behind a card on paper, rather than a card floating on nothing: the
 * elevation comes from the surface change and a hairline, not from shadow.
 */
export function AuthShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-band">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto max-w-page px-6 py-5">
          <Link href="/" className="rounded-control text-h4 font-medium tracking-tight text-ink">
            Grant<span className="text-brand-ink">Align</span>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-[26rem]">
          <Overline>{eyebrow}</Overline>
          <h1 className="mt-4 text-h1 font-medium tracking-tight text-ink">{title}</h1>
          {intro && <p className="mt-3 text-body text-ink-muted">{intro}</p>}

          <div className="mt-8 rounded-card border border-line bg-card p-6 shadow-raised">
            {children}
          </div>

          {footer && (
            <div className="mt-6 border-t border-line-strong pt-5 text-body-sm text-ink-muted">
              {footer}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
