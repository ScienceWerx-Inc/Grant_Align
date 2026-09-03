import { SkeletonCard, SkeletonLine } from '@/components/ui';

/** Detail pages are a two-column layout; matching it avoids a jump on load. */
export default function SeekerLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading organization…</span>
      <div className="mb-6 space-y-2.5">
        <SkeletonLine className="h-6 w-72 max-w-full" />
        <SkeletonLine className="h-3 w-[30rem] max-w-full" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,26rem]">
        <div className="space-y-6">
          <SkeletonCard rows={5} />
          <SkeletonCard rows={3} />
        </div>
        <div className="space-y-6">
          <SkeletonCard rows={6} />
          <SkeletonCard rows={4} />
        </div>
      </div>
    </div>
  );
}
