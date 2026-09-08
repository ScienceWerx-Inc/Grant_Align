/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this codebase has no styling
 * dependencies and one 12-line helper is not worth two more.
 *
 * The tradeoff to know about: this does NOT resolve conflicting Tailwind
 * utilities. `cn('px-3', 'px-6')` emits both, and which one wins is decided by
 * their order in the compiled stylesheet, not by their order here. So a
 * component must not rely on a caller's class overriding one of its own.
 * Where a caller needs to change something the component already sets, the
 * component takes a prop for it (`size`, `variant`, `tone`) rather than
 * accepting an override through `className`.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
