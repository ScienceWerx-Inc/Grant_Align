import { SkeletonCard, SkeletonLine } from '@/components/ui';

/** Matches is a stack of grouped lists rather than a stat row. */
export default function MatchesLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading matches…</span>
      <div className="mb-6 space-y-2.5">
        <SkeletonLine className="h-6 w-32" />
        <SkeletonLine className="h-3 w-[28rem] max-w-full" />
      </div>
      <div className="space-y-6">
        <SkeletonCard rows={4} />
        <SkeletonCard rows={4} />
      </div>
    </div>
  );
}
