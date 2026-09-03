import Link from 'next/link';
import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'Sign in — Grant Align' };

/**
 * Signing in is the last step of the marketing surface, not the first step of
 * the tool, so it follows the landing page's system. The application goes light
 * on the other side of it - that is the moment the product stops selling and
 * starts working, and it is the right place for the palette to change.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-obsidian font-sans text-chalk antialiased">
      <header className="border-b border-graphite">
        <div className="mx-auto max-w-page px-6 py-5">
          <Link href="/" className="text-heading-xs text-chalk">
            Grant<span className="text-smoke">Align</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-page flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-[26rem]">
          <p className="meta">Account</p>
          <h1 className="mt-6 text-heading font-normal text-chalk">Sign in</h1>
          <p className="mt-4 text-body leading-[1.6] text-smoke">
            Grant seekers, funders and platform staff each see a different view of the same data.
          </p>

          <LoginForm next={next} />

          <p className="mt-10 border-t border-graphite pt-6 text-[13px] text-iron">
            Accounts are created by a platform administrator. Self-service would let anyone claim
            to work at a foundation.
          </p>
        </div>
      </main>
    </div>
  );
}
