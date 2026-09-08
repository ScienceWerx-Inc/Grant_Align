'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { IconClose, IconChevronDown, type IconProps } from '@/components/icons';

/**
 * Interactive primitives.
 *
 * Split from ui.tsx so the server components there stay server components -
 * importing one client primitive into that file would pull the whole primitive
 * layer across the boundary.
 *
 * Overlays are built on the native <dialog> element rather than a portal and a
 * hand-rolled focus trap. `showModal()` gives focus containment, Escape to
 * close, inert background content and the top layer for free, all of which are
 * easy to get subtly wrong by hand and all of which matter for keyboard users.
 */

/* ================================================================ overlays */

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Fires for Escape as well as close(), so the caller's state cannot drift
    // out of sync with what is actually on screen.
    const handle = () => onClose();
    el.addEventListener('close', handle);
    return () => el.removeEventListener('close', handle);
  }, [onClose]);

  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // ::backdrop cannot be reached by a utility class, so the backdrop tone
      // is set here against the same ink token the rest of the system uses.
      className="m-auto w-[min(32rem,92vw)] rounded-card border border-line bg-card p-0
                 text-ink-body shadow-modal backdrop:bg-ink/40"
      onClick={e => {
        // Clicking the backdrop closes; clicking the panel must not.
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id={titleId} className="text-h4 font-medium text-ink">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close" className="btn-icon">
          <IconClose />
        </button>
      </div>
      <div className="px-5 py-4 text-body-sm">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-line bg-band px-5 py-3">{footer}</div>
      )}
    </dialog>
  );
}

/**
 * Edge sheet. The mobile navigation, and anything else that wants to slide in
 * from the side rather than sit in the middle of the page.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const ref = useDialog(open, onClose);
  const titleId = useId();

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className="ml-auto mr-0 mt-0 h-full max-h-none w-[min(20rem,85vw)] rounded-none border-l
                 border-line bg-card p-0 text-ink-body shadow-modal backdrop:bg-ink/40"
      onClick={e => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
        <h2 id={titleId} className="text-h4 font-medium text-ink">
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close menu" className="btn-icon">
          <IconClose />
        </button>
      </div>
      <div className="px-3 py-3">{children}</div>
    </dialog>
  );
}

/* ==================================================================== tabs */

export function Tabs({
  tabs,
  initial = 0,
}: {
  tabs: { label: string; content: React.ReactNode }[];
  initial?: number;
}) {
  const [active, setActive] = useState(initial);
  const baseId = useId();

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-line">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            id={`${baseId}-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${i}`}
            // Only the active tab is in the tab order; arrow keys move between
            // them, which is what the tablist pattern expects.
            tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight') setActive((active + 1) % tabs.length);
              if (e.key === 'ArrowLeft') setActive((active - 1 + tabs.length) % tabs.length);
            }}
            className={cn(
              '-mb-px border-b-2 px-3.5 py-2 text-body-sm font-medium transition',
              i === active
                ? 'border-brand text-ink'
                : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`${baseId}-panel-${i}`}
          aria-labelledby={`${baseId}-tab-${i}`}
          hidden={i !== active}
          className="pt-4"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}

/* ================================================================= tooltip */

/**
 * Tooltip.
 *
 * Shown on hover AND on focus, so it is reachable without a pointer, and wired
 * with aria-describedby rather than a bare title attribute. Never the only
 * place a piece of information appears.
 */
export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <span className="group relative inline-flex">
      <span aria-describedby={id} className="inline-flex">
        {children}
      </span>
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2
                   whitespace-nowrap rounded-control bg-ink px-2 py-1 text-caption text-paper
                   opacity-0 shadow-overlay transition group-hover:opacity-100
                   group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

/* =================================================================== toast */

export function Toast({
  message,
  tone = 'info',
  onDismiss,
}: {
  message: string;
  tone?: 'info' | 'success' | 'danger';
  onDismiss?: () => void;
}) {
  const tones = {
    info: 'border-info/30 bg-info-tint text-ink',
    success: 'border-success/30 bg-success-tint text-ink',
    danger: 'border-danger/30 bg-danger-tint text-ink',
  } as const;

  return (
    <div
      // Polite rather than assertive: a toast is a confirmation, and should not
      // interrupt whatever a screen reader is in the middle of saying.
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-start gap-3 rounded-control border px-4 py-3 text-body-sm shadow-overlay',
        tones[tone],
      )}
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="btn-icon h-6 w-6">
          <IconClose className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/* =============================================================== accordion */

/**
 * Built on <details> so it works before hydration and without JavaScript. The
 * chevron is rotated by the open state rather than swapped for a second icon.
 */
export function Accordion({
  items,
}: {
  items: { label: string; content: React.ReactNode; icon?: (p: IconProps) => React.ReactElement }[];
}) {
  return (
    <div className="divide-y divide-line rounded-card border border-line bg-card">
      {items.map(item => (
        <details key={item.label} className="group">
          <summary
            className="flex cursor-pointer list-none items-center gap-2.5 px-4 py-3
                       text-body-sm font-medium text-ink transition hover:bg-band"
          >
            {item.icon && <item.icon className="h-4 w-4 shrink-0 text-ink-muted" />}
            <span className="flex-1">{item.label}</span>
            <IconChevronDown className="h-4 w-4 shrink-0 text-ink-muted transition group-open:rotate-180" />
          </summary>
          <div className="px-4 pb-4 text-body-sm text-ink-body">{item.content}</div>
        </details>
      ))}
    </div>
  );
}
