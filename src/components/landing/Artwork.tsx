/**
 * The landing page's hero graphic: the matching problem, drawn as a dot field.
 *
 * The reference system permits essentially one kind of imagery - a dot-matrix
 * built from density rather than fill, with the occasional gold mark to show
 * the way. That constraint suits this product exactly. Non-profits on the
 * left, funders on the right, every plausible pairing drawn between them: most
 * of them hairline and severed, two of them completed and marked in gold.
 *
 * The composition carries the argument the copy makes. The value is not in
 * finding matches, it is in what gets ruled out, so the eye should land on the
 * two threads that finish precisely because everything around them does not.
 *
 * Hand-placed rather than generated: random scatter reads as noise, and random
 * coordinates would differ between server and client renders and break
 * hydration.
 *
 * No gradients, no glow filters, no shadows - structure comes from line weight
 * and opacity alone, as the system requires.
 */

/** [x, y] in a 1200 x 420 field. */
const SEEKERS = [
  [188, 74], [150, 122], [206, 166], [162, 212],
  [214, 258], [168, 306], [232, 110], [178, 350],
] as const;

const FUNDERS = [
  [1012, 62], [1050, 108], [986, 152], [1038, 200],
  [1000, 248], [1054, 292], [992, 332], [1030, 372],
  [944, 96], [956, 288],
] as const;

/** [seeker, funder]. The two that connect are listed separately. */
const RULED_OUT: readonly (readonly [number, number])[] = [
  [0, 3], [1, 1], [1, 5], [3, 2], [3, 9], [4, 0], [5, 3], [6, 1],
  [7, 6], [7, 9], [2, 8], [0, 9], [4, 4], [1, 8], [3, 5], [7, 2],
  [0, 0], [2, 4], [5, 7], [6, 8], [2, 1], [5, 0], [6, 4], [4, 8],
];

const MATCHED: readonly (readonly [number, number])[] = [
  [2, 2],
  [4, 6],
];

function thread(a: readonly [number, number], b: readonly [number, number]): string {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const midX = (x1 + x2) / 2;
  const lift = (y1 + y2) / 2 + (y1 - y2) * 0.18;
  return `M ${x1} ${y1} C ${midX - 150} ${y1}, ${midX + 150} ${lift}, ${x2} ${y2}`;
}

/** Dot field filling the space behind each cluster, for density. */
const DUST = [
  [96, 44], [124, 96], [88, 178], [136, 258], [104, 332], [244, 46],
  [258, 196], [270, 300], [116, 384], [222, 392],
  [908, 44], [1088, 78], [1082, 226], [920, 202], [1096, 340], [900, 366],
  [928, 140], [1074, 156], [912, 262], [1064, 404],
] as const;

export function MatchArtwork() {
  return (
    <svg
      viewBox="0 0 1200 420"
      role="img"
      aria-label="Many possible pairings between local non-profits and regional funders. Most are ruled out; two connect."
      className="h-auto w-full"
    >
      {/* Ruled out: hairline, dashed, drawn first so the live threads sit above. */}
      <g fill="none" stroke="#212121" strokeWidth="1" strokeDasharray="2 8" strokeLinecap="round">
        {RULED_OUT.map(([s, f], i) => (
          <path key={`r${i}`} d={thread(SEEKERS[s], FUNDERS[f])} />
        ))}
      </g>

      {/* The two that connect. Solid, chalk, full weight. */}
      <g fill="none" stroke="#f3f3f3" strokeWidth="1.25" strokeLinecap="round">
        {MATCHED.map(([s, f], i) => (
          <path key={`m${i}`} d={thread(SEEKERS[s], FUNDERS[f])} />
        ))}
      </g>

      {/* Background dust: density, not detail. */}
      <g fill="#474747">
        {DUST.map(([x, y], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r="1.5" />
        ))}
      </g>

      {/* Organizations. Matched ones get the gold compass-mark. */}
      <g>
        {SEEKERS.map(([x, y], i) => {
          const matched = MATCHED.some(([s]) => s === i);
          return matched ? (
            <g key={`s${i}`}>
              <circle cx={x} cy={y} r="3" fill="#f3f3f3" />
              <circle cx={x} cy={y} r="8" fill="none" stroke="#6f6759" strokeWidth="1.5" />
            </g>
          ) : (
            <circle key={`s${i}`} cx={x} cy={y} r="2.5" fill="#9c9c9c" />
          );
        })}
        {FUNDERS.map(([x, y], i) => {
          const matched = MATCHED.some(([, f]) => f === i);
          return matched ? (
            <g key={`f${i}`}>
              <circle cx={x} cy={y} r="3" fill="#f3f3f3" />
              <circle cx={x} cy={y} r="8" fill="none" stroke="#6f6759" strokeWidth="1.5" />
            </g>
          ) : (
            <circle key={`f${i}`} cx={x} cy={y} r="2.5" fill="#9c9c9c" />
          );
        })}
      </g>

      {/* Field labels, in the meta voice. */}
      <text x="150" y="24" fontSize="11" letterSpacing="3" fill="#9c9c9c" fontFamily="var(--font-input)">
        NON-PROFITS
      </text>
      <text x="944" y="24" fontSize="11" letterSpacing="3" fill="#9c9c9c" fontFamily="var(--font-input)">
        FUNDERS
      </text>
    </svg>
  );
}
