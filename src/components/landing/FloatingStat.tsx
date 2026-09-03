/**
 * A small glass card that floats over the hero visual.
 *
 * These sit ON the orb rather than beside it - the overlap is what creates the
 * sense of depth, and is the detail that most separates a composed hero from a
 * two-column template. The circular arrow is a visual affordance from the same
 * family; it links somewhere real rather than being decoration.
 */
export function FloatingStat({
  label,
  value,
  meter,
  href,
  className = '',
}: {
  label: string;
  value: string;
  meter?: number;
  href: string;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`group absolute w-[15.5rem] rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur-2xl transition hover:border-white/25 hover:bg-white/[0.09] ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium text-white/55">{label}</span>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/90 text-night-950 transition group-hover:bg-white">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <p className="mt-3 text-[15px] font-medium leading-snug text-white">{value}</p>

      {meter !== undefined && (
        <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-white/85" style={{ width: `${meter}%` }} />
        </div>
      )}
    </a>
  );
}
