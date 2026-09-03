import Link from 'next/link';
import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'Sign in — Grant Align' };

/**
 * Dark to match the landing page rather than the application.
 *
 * Signing in is the last step of the marketing surface, not the first step of
 * the tool, and switching palettes mid-flow reads as landing on a different
 * site. The application goes light on the other side of it, which is where the
 * change belongs: that is the moment the product turns into a working tool.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-night-950 text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-16rem] h-[40rem] w-[52rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(77,159,214,0.30),transparent)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_0%,black,transparent_70%)]" />
      </div>

      <header className="border-b border-white/[0.07]">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            Grant<span className="text-glow">Align</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="glass p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Grant seekers, funders and platform staff each see a different view of the same data.
          </p>
          <LoginForm next={next} />
        </div>

        <p className="mt-6 text-center text-xs text-white/35">
          Accounts are created by a platform administrator.
        </p>
      </main>
    </div>
  );
}
