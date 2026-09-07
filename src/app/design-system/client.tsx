'use client';

import { useState } from 'react';
import { Accordion, Modal, Sheet, Tabs, Toast, Tooltip } from '@/components/ui-client';
import { Button } from '@/components/ui';
import { IconCompliance, IconGeography, IconInfo, IconMission } from '@/components/icons';

/**
 * The half of the catalogue that needs state.
 *
 * Kept in its own client module so the catalogue page itself stays a server
 * component and the primitive layer is not dragged across the boundary.
 */
export function DesignSystemClient() {
  const [modal, setModal] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; tone: 'info' | 'success' | 'danger' }[]>([
    { id: 1, tone: 'success' },
  ]);

  return (
    <>
      <section>
        <h2 className="text-h3 font-medium tracking-tight text-ink">Overlays</h2>
        <p className="measure mt-1 text-body-sm text-ink-muted">
          Built on native &lt;dialog&gt;, so focus containment, Escape and inert background content
          are the platform&apos;s job rather than ours.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setModal(true)}>
            Open modal
          </Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Open sheet
          </Button>
          <Tooltip label="Shown on hover and on focus">
            <span className="btn-secondary">Hover or focus me</span>
          </Tooltip>
        </div>

        <Modal
          open={modal}
          onClose={() => setModal(false)}
          title="Remove this organization?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setModal(false)}>
                Remove
              </Button>
            </>
          }
        >
          Its match history goes with it. This cannot be undone.
        </Modal>

        <Sheet open={sheet} onClose={() => setSheet(false)} title="Menu">
          <nav className="flex flex-col">
            {['Dashboard', 'Grant seekers', 'Grant givers', 'Matches'].map(item => (
              <a
                key={item}
                href="#"
                className="rounded-control px-3 py-2.5 text-body-sm text-ink-body transition hover:bg-band hover:text-ink"
              >
                {item}
              </a>
            ))}
          </nav>
        </Sheet>
      </section>

      <section>
        <h2 className="text-h3 font-medium tracking-tight text-ink">Tabs</h2>
        <div className="mt-5">
          <Tabs
            tabs={[
              { label: 'Profile', content: <p className="text-body-sm">The operational profile.</p> },
              { label: 'Matches', content: <p className="text-body-sm">Scored pairings.</p> },
              { label: 'Record', content: <p className="text-body-sm">Provenance and raw values.</p> },
            ]}
          />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-medium tracking-tight text-ink">Accordion</h2>
        <div className="mt-5">
          <Accordion
            items={[
              {
                label: 'Mission & program fit',
                icon: IconMission,
                content: 'Weighted 30. The largest single contributor to a score.',
              },
              {
                label: 'Geographic eligibility',
                icon: IconGeography,
                content: 'Weighted 20. Frederick County and the surrounding region.',
              },
              {
                label: 'Documentation readiness',
                icon: IconCompliance,
                content: 'Weighted 7. Missing mandatory documents are treated as disqualifying.',
              },
            ]}
          />
        </div>
      </section>

      <section>
        <h2 className="text-h3 font-medium tracking-tight text-ink">Toasts</h2>
        <div className="mt-5 space-y-3">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              tone={toast.tone}
              message={
                toast.tone === 'success'
                  ? 'Profile saved. Matches rescore on the next run.'
                  : toast.tone === 'danger'
                    ? 'The provider returned a quota error. Nothing was written.'
                    : 'Research for this funder is queued.'
              }
              onDismiss={() => setToasts(list => list.filter(t => t.id !== toast.id))}
            />
          ))}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              icon={IconInfo}
              onClick={() => setToasts(list => [...list, { id: Date.now(), tone: 'info' }])}
            >
              Add info toast
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setToasts(list => [...list, { id: Date.now(), tone: 'danger' }])}
            >
              Add danger toast
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
