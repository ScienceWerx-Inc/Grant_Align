import Link from 'next/link';
import { LoginForm } from '@/components/LoginForm';

export const metadata = { title: 'Sign in — Grant Align' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto max-w-6xl px-6 py-3.5">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Grant<span className="text-brand">Align</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">
          Grant seekers, funders and platform staff each see a different view of the same data.
        </p>
        <LoginForm next={next} />
      </main>
    </div>
  );
}
