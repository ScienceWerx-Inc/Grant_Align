/**
 * The workflow diagram from requirements section 3, drawn rather than described.
 *
 * Inline SVG with no library: it is a fixed diagram on a page that should stay
 * fast, and it needs to scale cleanly. The viewBox does the responsive work;
 * the wrapper allows horizontal scroll on narrow screens so the shapes never
 * squash into illegibility.
 */
export function WorkflowDiagram() {
  return (
    <div className="overflow-x-auto">
      <svg
        viewBox="0 0 880 350"
        role="img"
        aria-label="Seeker intake and donor research both feed the matching engine, which outputs an apply, worth a look, or skip verdict."
        className="mx-auto h-auto w-full min-w-[680px] max-w-4xl"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#474747" />
          </marker>
        </defs>

        <text x="150" y="22" textAnchor="middle" className="text-[11px] tracking-[0.18em]" fill="#9c9c9c">GRANT SEEKER</text>
        {[
          ['CRM & profile', 'Organization, contacts'],
          ['AI interviewer', 'What they do - and do NOT'],
          ['Eligibility', 'Form 990, good standing'],
        ].map(([title, sub], i) => (
          <g key={title} transform={`translate(30, ${40 + i * 74})`}>
            <rect width="240" height="58" rx="8" fill="none" stroke="#212121" />
            <text x="16" y="24" className="text-[13px]" fill="#f3f3f3">{title}</text>
            <text x="16" y="42" className="text-[11px]" fill="#9c9c9c">{sub}</text>
          </g>
        ))}

        <text x="730" y="22" textAnchor="middle" className="text-[11px] tracking-[0.18em]" fill="#9c9c9c">GRANT GIVER</text>
        {[
          ['Donor repository', 'Local funder list'],
          ['Research engine', 'Crawl + IRS 990s + search'],
          ['AI donor interviewer', 'Point-of-contact intake'],
        ].map(([title, sub], i) => (
          <g key={title} transform={`translate(610, ${40 + i * 74})`}>
            <rect width="240" height="58" rx="8" fill="none" stroke="#212121" />
            <text x="16" y="24" className="text-[13px]" fill="#f3f3f3">{title}</text>
            <text x="16" y="42" className="text-[11px]" fill="#9c9c9c">{sub}</text>
          </g>
        ))}

        <g transform="translate(310, 114)">
          <rect width="260" height="92" rx="8" fill="none" stroke="#6f6759" strokeWidth="1.5" />
          <text x="130" y="34" textAnchor="middle" className="text-[13px] tracking-[0.06em]" fill="#f3f3f3">MATCHING ENGINE</text>
          <text x="130" y="56" textAnchor="middle" className="text-[11px]" fill="#9c9c9c">Six weighted dimensions</text>
          <text x="130" y="73" textAnchor="middle" className="text-[11px]" fill="#9c9c9c">Blockers override the score</text>
        </g>

        <path d="M 272 141 L 306 154" stroke="#212121" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 608 141 L 574 154" stroke="#212121" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 272 215 L 306 186" stroke="#212121" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 608 215 L 574 186" stroke="#212121" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 440 208 L 440 244" stroke="#212121" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

        {([['Apply', '#f3f3f3', 250], ['Worth a look', '#9c9c9c', 380], ['Skip', '#474747', 510]] as const).map(
          ([label, color, x]) => (
            <g key={label} transform={`translate(${x}, 252)`}>
              <rect width="120" height="34" rx="8" fill="none" stroke={color} strokeWidth="1" />
              <text x="60" y="22" textAnchor="middle" className="text-[12px]" fill={color}>{label}</text>
            </g>
          ),
        )}
        <path d="M 405 244 L 330 252" stroke="#212121" strokeWidth="1" fill="none" />
        <path d="M 475 244 L 550 252" stroke="#212121" strokeWidth="1" fill="none" />

        <text x="440" y="322" textAnchor="middle" className="text-[11px]" fill="#9c9c9c">
          Every verdict cites the specific seeker and funder facts behind it.
        </text>
      </svg>
    </div>
  );
}
