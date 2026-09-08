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
        className="mx-auto h-auto w-full min-w-[680px] max-w-6xl"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#102A43" opacity="0.4" />
          </marker>
        </defs>

        <text x="150" y="22" textAnchor="middle" className="text-[11px] font-semibold tracking-widest uppercase" fill="#20845B">Grant Seeker</text>
        {[
          ['Organization details', 'CRM & profile data'],
          ['What they do — and do NOT', 'AI Interviewer'],
          ['Form 990, good standing', 'Eligibility verification'],
        ].map(([title, sub], i) => (
          <g key={title} transform={`translate(30, ${40 + i * 74})`}>
            <rect width="240" height="58" rx="8" fill="#ffffff" stroke="#E2E7E3" strokeWidth="1.5" />
            <text x="16" y="24" className="text-[13px] font-semibold" fill="#102A43">{title}</text>
            <text x="16" y="42" className="text-[11px]" fill="#102A43" opacity="0.6">{sub}</text>
          </g>
        ))}

        <text x="730" y="22" textAnchor="middle" className="text-[11px] font-semibold tracking-widest uppercase" fill="#F07A55">Potential Funders</text>
        {[
          ['Mission fit', 'Thematic alignment'],
          ['Geographic fit', 'Location eligibility'],
          ['Size & other factors', 'Award size vs scale'],
        ].map(([title, sub], i) => (
          <g key={title} transform={`translate(610, ${40 + i * 74})`}>
            <rect width="240" height="58" rx="8" fill="#ffffff" stroke="#E2E7E3" strokeWidth="1.5" />
            <text x="16" y="24" className="text-[13px] font-semibold" fill="#102A43">{title}</text>
            <text x="16" y="42" className="text-[11px]" fill="#102A43" opacity="0.6">{sub}</text>
          </g>
        ))}

        <g transform="translate(310, 114)">
          <rect width="260" height="92" rx="12" fill="#E8F3EA" stroke="#20845B" strokeWidth="1.5" />
          <text x="130" y="34" textAnchor="middle" className="text-[13px] font-semibold tracking-wide uppercase" fill="#20845B">Matching Engine</text>
          <text x="130" y="56" textAnchor="middle" className="text-[12px] font-medium" fill="#102A43">Six weighted dimensions</text>
          <text x="130" y="73" textAnchor="middle" className="text-[11px]" fill="#102A43" opacity="0.7">calculate overall fit score</text>
        </g>

        <path d="M 272 141 L 306 154" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 608 141 L 574 154" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 272 215 L 306 186" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 608 215 L 574 186" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />
        <path d="M 440 208 L 440 244" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" markerEnd="url(#arrow)" />

        {([['Apply', '#20845B', 250], ['Worth a look', '#F07A55', 380], ['Skip', '#102A43', 510]] as const).map(
          ([label, color, x]) => (
            <g key={label} transform={`translate(${x}, 252)`}>
              <rect width="120" height="34" rx="17" fill="#ffffff" stroke={color as string} strokeWidth="1.5" />
              <text x="60" y="22" textAnchor="middle" className="text-[12px] font-semibold" fill={color as string}>{label}</text>
            </g>
          ),
        )}
        <path d="M 405 244 L 330 252" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />
        <path d="M 475 244 L 550 252" stroke="#102A43" strokeOpacity="0.2" strokeWidth="1.5" fill="none" />

        <text x="440" y="322" textAnchor="middle" className="text-[12px] font-medium" fill="#102A43" opacity="0.6">
          Every verdict cites the specific seeker and funder facts behind it.
        </text>
      </svg>
    </div>
  );
}
