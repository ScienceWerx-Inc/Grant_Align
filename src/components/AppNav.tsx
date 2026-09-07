'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { Sheet } from '@/components/ui-client';
import { IconMenu } from '@/components/icons';

export interface NavItem {
  href: string;
  label: string;
}

/**
 * The application's navigation.
 *
 * A client component because three things here depend on the browser: which
 * link is current, whether the page has scrolled, and whether the mobile sheet
 * is open. The items themselves are still decided on the server from the
 * user's role, and passed in - the role model never reaches the browser.
 */
export function AppNav({ items, children }: { items: NavItem[]; children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  /*
   * The header carries no border at rest and gains a hairline once the page
   * moves under it. At the top of a page the header is part of the page; once
   * content slides beneath it, it needs an edge to sit on.
   */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A link is current if the path matches it or sits underneath it, so
  // /seekers/<id> still lights up "Grant seekers".
  const isCurrent = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <>
      <header
        className={cn(
          'no-print sticky top-0 z-30 bg-paper/90 backdrop-blur transition',
          scrolled ? 'border-b border-line' : 'border-b border-transparent',
        )}
      >
        <div className="mx-auto flex max-w-page items-center gap-6 px-6 py-3">
          <Link href="/" className="rounded-control text-h4 font-medium tracking-tight text-ink">
            Grant<span className="text-brand-ink">Align</span>
          </Link>

          <nav aria-label="Main" className="hidden gap-1 md:flex">
            {items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(item.href) ? 'page' : undefined}
                className={cn(
                  'rounded-control px-3 py-1.5 text-body-sm transition',
                  isCurrent(item.href)
                    ? 'bg-brand-tint font-medium text-brand-ink'
                    : 'text-ink-muted hover:bg-band hover:text-ink',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {children}
            <button
              type="button"
              onClick={() => setMenu(true)}
              aria-label="Open menu"
              aria-expanded={menu}
              className="btn-icon md:hidden"
            >
              <IconMenu />
            </button>
          </div>
        </div>
      </header>

      <Sheet open={menu} onClose={() => setMenu(false)} title="Menu">
        <nav aria-label="Main" className="flex flex-col">
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenu(false)}
              aria-current={isCurrent(item.href) ? 'page' : undefined}
              className={cn(
                'rounded-control px-3 py-2.5 text-body-sm transition',
                isCurrent(item.href)
                  ? 'bg-brand-tint font-medium text-brand-ink'
                  : 'text-ink-body hover:bg-band hover:text-ink',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </Sheet>
    </>
  );
}
