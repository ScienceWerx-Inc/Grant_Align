import Link from 'next/link';
import { Overline } from '@/components/ui';

/**
 * 404.
 *
 * Says nothing about whether the thing exists but is out of reach - that is
 * /no-access's job, and conflating the two would leak the existence of
 * organizations whose ids appear in URLs.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-band px-6">
      <div className="w-full max-w-md rounded-card border border-line bg-card p-8 text-center shadow-raised">
        <Overline>404</Overline>
        <h1 className="mt-3 text-h2 font-medium tracking-tight text-ink">
          That page does not exist
        </h1>
        <p className="mt-3 text-body-sm leading-relaxed text-ink-muted">
          The link may be out of date, or the address may have been mistyped.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
