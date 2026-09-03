/**
 * The landing page's artwork: the matching problem itself, drawn.
 *
 * A generic orb or gradient blob would say nothing about this product. What
 * this system actually does is weigh many possible pairings and keep very few,
 * so the picture is exactly that: non-profits on the left, funders on the
 * right, and every plausible pairing drawn between them - most of them faint
 * and severed, a handful worth a look, two that connect.
 *
 * The composition carries the argument the copy makes. The eye lands on the
 * two bright threads because they are the only ones that finish, which is the
 * point: the value is in what gets ruled out.
 *
 * Hand-placed rather than generated. Random scatter reads as noise, and random
 * positions would differ between server and client renders and break
 * hydration. Every coordinate here is deliberate.
 */

/** Non-profits, left field. [x, y, radius] */
const SEEKERS = [
  [96, 86, 4], [72, 148, 3], [118, 206, 5], [80, 262, 3],
  [128, 318, 4], [88, 372, 3], [146, 132, 3], [104, 420, 4],
] as const;

/** Funders, right field. */
const FUNDERS = [
  [796, 70, 4], [834, 132, 3], [770, 180, 5], [822, 240, 3],
  [784, 292, 4], [838, 348, 3], [774, 386, 4], [816, 434, 3],
  [726, 112, 3], [740, 330, 3],
] as const;

type Verdict = 'apply' | 'maybe' | 'skip';

/** [seeker index, funder index, verdict] */
const LINKS: readonly (readonly [number, number, Verdict])[] = [
  [2, 2, 'apply'],
  [4, 6, 'apply'],
  [0, 0, 'maybe'],
  [2, 4, 'maybe'],
  [5, 7, 'maybe'],
  [6, 8, 'maybe'],
  [0, 3, 'skip'], [1, 1, 'skip'], [1, 5, 'skip'], [3, 2, 'skip'],
  [3, 9, 'skip'], [4, 0, 'skip'], [5, 3, 'skip'], [6, 1, 'skip'],
  [7, 6, 'skip'], [7, 9, 'skip'], [2, 8, 'skip'], [0, 9, 'skip'],
  [4, 4, 'skip'], [1, 8, 'skip'], [3, 5, 'skip'], [7, 2, 'skip'],
];

const STYLE: Record<Verdict, { stroke: string; width: number; opacity: number; dash?: string }> = {
  // The two that connect: solid, bright, drawn last so they sit on top.
  apply: { stroke: 'url(#thread-apply)', width: 1.6, opacity: 1 },
  maybe: { stroke: 'url(#thread-maybe)', width: 1, opacity: 0.5 },
  // Ruled out: dashed and faint. Present, because the work of excluding them
  // is the product, but visibly not carrying anything.
  skip: { stroke: '#3a4761', width: 0.75, opacity: 0.32, dash: '2 7' },
};

/** A curve that bows toward the centre, so the field reads as woven. */
function thread(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const lift = (y1 + y2) / 2 + (y1 - y2) * 0.18;
  return `M ${x1} ${y1} C ${midX - 110} ${y1}, ${midX + 110} ${lift}, ${x2} ${y2}`;
}

export function MatchArtwork() {
  const ordered = [
    ...LINKS.filter(l => l[2] === 'skip'),
    ...LINKS.filter(l => l[2] === 'maybe'),
    ...LINKS.filter(l => l[2] === 'apply'),
  ];

  return (
    <svg
      viewBox="0 0 900 470"
      role="img"
      aria-label="Many possible pairings between local non-profits and regional funders; most are ruled out, a few are worth a look, and two connect."
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="thread-apply" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity="0.15" />
          <stop offset="45%" stopColor="#e9f6ff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#8ed0ff" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="thread-maybe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0c05a" stopOpacity="0.08" />
          <stop offset="50%" stopColor="#f0c05a" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f0c05a" stopOpacity="0.2" />
        </linearGradient>
        <radialGradient id="node-live">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#bfe4ff" />
          <stop offset="100%" stopColor="#5aa9e0" />
        </radialGradient>

        <filter id="soft-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

      </defs>

      {/* Threads, ruled-out first so the live ones sit above them. */}
      <g fill="none" strokeLinecap="round">
        {ordered.map(([s, f, verdict], i) => {
          const [x1, y1] = SEEKERS[s];
          const [x2, y2] = FUNDERS[f];
          const style = STYLE[verdict];
          return (
            <path
              key={`${s}-${f}-${i}`}
              d={thread(x1, y1, x2, y2)}
              stroke={style.stroke}
              strokeWidth={style.width}
              strokeOpacity={style.opacity}
              strokeDasharray={style.dash}
              filter={verdict === 'apply' ? 'url(#soft-glow)' : undefined}
            />
          );
        })}
      </g>

      {/* The organizations. */}
      <g>
        {SEEKERS.map(([x, y, r], i) => {
          const live = i === 2 || i === 4;
          return (
            <g key={`s${i}`}>
              {live && <circle cx={x} cy={y} r={r + 7} fill="#8ed0ff" opacity="0.14" />}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={live ? 'url(#node-live)' : '#243247'}
                stroke={live ? 'none' : '#3c4c66'}
                strokeWidth="1"
              />
            </g>
          );
        })}
        {FUNDERS.map(([x, y, r], i) => {
          const live = i === 2 || i === 6;
          return (
            <g key={`f${i}`}>
              {live && <circle cx={x} cy={y} r={r + 7} fill="#8ed0ff" opacity="0.14" />}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={live ? 'url(#node-live)' : '#243247'}
                stroke={live ? 'none' : '#3c4c66'}
                strokeWidth="1"
              />
            </g>
          );
        })}
      </g>

      {/* Field labels, small enough to be texture rather than a diagram. */}
      <text x="72" y="34" fontSize="10" letterSpacing="3.4" fill="#5b6f8f">NON-PROFITS</text>
      <text x="726" y="34" fontSize="10" letterSpacing="3.4" fill="#5b6f8f">FUNDERS</text>
    </svg>
  );
}
