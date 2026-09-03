import { SkeletonCard, SkeletonLine, SkeletonStats } from '@/components/ui';

/**
 * Shown for every app route while its data loads.
 *
 * Deliberately mirrors the shape most of these pages share - a heading, a stat
 * row, then panels - so the transition into real content is a fill rather than
 * a relayout. A spinner would be less work and worse: it says "something is
 * happening" where this says "here is the page, the numbers are coming".
 */
export default function AppLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>

      <div className="mb-6 space-y-2.5">
        <SkeletonLine className="h-6 w-52" />
        <SkeletonLine className="h-3 w-96 max-w-full" />
      </div>

      <SkeletonStats />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={3} />
      </div>
    </div>
  );
}
