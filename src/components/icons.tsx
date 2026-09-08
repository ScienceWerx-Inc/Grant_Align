/**
 * The icon set.
 *
 * Hand-authored rather than a dependency, matching how the landing artwork is
 * already drawn. One geometry for all of them - 24px box, 1.5 stroke,
 * `currentColor`, round caps - so they sit together on a line of text without
 * one looking heavier than its neighbour.
 *
 * Icons here are decorative by default (`aria-hidden`), because in this app an
 * icon always accompanies a text label rather than replacing it. The one place
 * that is not true is an icon-only button, which carries its own accessible
 * name on the button element.
 */

export interface IconProps {
  className?: string;
  /** Only set this when the icon is the sole carrier of meaning. */
  title?: string;
}

function Svg({ className = 'h-4 w-4', title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ verdict */

/** Apply. A decision that has been made, not a task that is done. */
export function IconApply(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </Svg>
  );
}

/** Worth a look. Deliberately not a warning triangle - it is not a hazard. */
export function IconMaybe(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.2v4.4" />
      <path d="M12 15.6h.01" />
    </Svg>
  );
}

/** Skip. A closed door rather than an error. */
export function IconSkip(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.6 12h6.8" />
    </Svg>
  );
}

/**
 * A blocker. This one IS a hazard sign, and that is the point: a disqualifier
 * is categorically different from a low score, so it must not share the
 * vocabulary of the verdict icons above.
 */
export function IconBlocker(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M10.3 3.9 2.4 17.4a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

/* --------------------------------------------------- the six dimensions ----
 * Order and meaning follow DIMENSIONS in src/ai/flows/scoreMatch.ts. These are
 * mapped by key in ui.tsx so a dimension cannot pick up the wrong icon.
 */

/** mission - Mission & program fit. */
export function IconMission(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" />
    </Svg>
  );
}

/** population - Population served. */
export function IconPopulation(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M9 11.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" />
      <path d="M2.8 19.2a6.2 6.2 0 0 1 12.4 0" />
      <path d="M16.4 5.5a3.2 3.2 0 0 1 0 6" />
      <path d="M18.4 14.2a6.2 6.2 0 0 1 2.8 5" />
    </Svg>
  );
}

/** geography - Geographic eligibility. */
export function IconGeography(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M19 10.3c0 5-7 11-7 11s-7-6-7-11a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </Svg>
  );
}

/** exclusions - Clear of donor exclusions. */
export function IconExclusions(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </Svg>
  );
}

/** size - Grant size vs. organization scale. */
export function IconSize(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 4v16" />
      <path d="M5 7h14" />
      <path d="M5 7 2.5 13h5L5 7Z" />
      <path d="M19 7l-2.5 6h5L19 7Z" />
      <path d="M8.5 20h7" />
    </Svg>
  );
}

/** compliance - Documentation readiness. */
export function IconCompliance(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5" />
      <path d="m9.2 14.4 1.8 1.8 3.6-3.8" />
    </Svg>
  );
}

/* --------------------------------------------------------------- interface */

export function IconChevronDown(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function IconArrowRight(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12h15" />
      <path d="m13 5.5 6.5 6.5-6.5 6.5" />
    </Svg>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </Svg>
  );
}

export function IconMenu(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </Svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.4v4.6" />
      <path d="M12 8.2h.01" />
    </Svg>
  );
}

export function IconExternal(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 4.5H19.5V10.5" />
      <path d="M19.5 4.5 11 13" />
      <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
    </Svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

/** The only animated icon. Motion is suppressed by the reduced-motion rule. */
export function IconSpinner({ className = 'h-4 w-4' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} opacity={0.25} />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </svg>
  );
}
