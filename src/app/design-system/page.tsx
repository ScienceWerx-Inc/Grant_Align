import { notFound } from 'next/navigation';
import { DesignSystemClient } from './client';
import {
  Alert,
  BlockerList,
  Button,
  Card,
  Checkbox,
  DimensionRow,
  EmptyState,
  Field,
  FieldShell,
  IconButton,
  Overline,
  PageHeader,
  RadioCard,
  ScoreMeter,
  SkeletonCard,
  SkeletonLine,
  SkeletonStats,
  StatTile,
  Tags,
  VerdictBadge,
} from '@/components/ui';
import { IconClose, IconExternal, IconPlus } from '@/components/icons';
import { DIMENSIONS } from '@/ai/flows/scoreMatch';

export const metadata = { title: 'Design system — Grant Align' };

/**
 * The primitive catalogue.
 *
 * Every primitive in every state, on one page, so a change to a token can be
 * judged against the whole system at once rather than discovered later on a
 * screen nobody thought to open.
 *
 * Development only. It ships no data and no actions, but it is scaffolding
 * rather than product, and a route that renders every component in the app is
 * not something to leave reachable in production.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-page px-6 py-12">
        <Overline>Internal</Overline>
        <PageHeader
          title="Design system"
          subtitle="Every primitive, every state. Development only — this route is not reachable in production."
        />

        <div className="space-y-12">
          <Swatches />
          <TypeScale />
          <Buttons />
          <FormFields />
          <Feedback />
          <VerdictLanguage />
          <DataDisplay />
          <LoadingStates />
          {/* Overlays, tabs and tooltips need state, so they live client-side. */}
          <DesignSystemClient />
        </div>
      </div>
    </div>
  );
}

function Spec({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-h3 font-medium tracking-tight text-ink">{title}</h2>
      {note && <p className="measure mt-1 text-body-sm text-ink-muted">{note}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Swatch({ name, className, hex }: { name: string; className: string; hex: string }) {
  return (
    <div>
      <div className={`h-14 rounded-control border border-line ${className}`} />
      <p className="mt-1.5 text-caption font-medium text-ink">{name}</p>
      <p className="font-mono text-caption text-ink-muted">{hex}</p>
    </div>
  );
}

function Swatches() {
  return (
    <Spec
      title="Colour"
      note="Warm neutral base, one grounded brand, one accent, and semantics. Every foreground token clears AA on paper, card and band."
    >
      <div className="space-y-6">
        <div>
          <p className="eyebrow mb-3">Surface</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="paper" className="bg-paper" hex="#FAF9F5" />
            <Swatch name="card" className="bg-card" hex="#FFFFFF" />
            <Swatch name="band" className="bg-band" hex="#F2F0E9" />
            <Swatch name="sink" className="bg-sink" hex="#E9E6DC" />
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Ink</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="ink" className="bg-ink" hex="#1C1A17 · 16.5:1" />
            <Swatch name="ink-body" className="bg-ink-body" hex="#35322C · 12.1:1" />
            <Swatch name="ink-muted" className="bg-ink-muted" hex="#635E52 · 6.1:1" />
            <Swatch name="ink-faint" className="bg-ink-faint" hex="#7C7768 · 4.3:1" />
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Brand &amp; accent</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="brand" className="bg-brand" hex="#20845B · fills" />
            <Swatch name="brand-ink" className="bg-brand-ink" hex="#1A6B4A · text" />
            <Swatch name="brand-tint" className="bg-brand-tint" hex="#E8F3EA" />
            <Swatch name="accent" className="bg-accent" hex="#B34A28" />
          </div>
        </div>
        <div>
          <p className="eyebrow mb-3">Semantic</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Swatch name="success" className="bg-success" hex="#1B6E45" />
            <Swatch name="warning" className="bg-warning" hex="#7A5610" />
            <Swatch name="danger" className="bg-danger" hex="#9B3427" />
            <Swatch name="info" className="bg-info" hex="#1F5F8B" />
          </div>
        </div>
      </div>
    </Spec>
  );
}

function TypeScale() {
  // Written out rather than interpolated: Tailwind scans source text, so a
  // constructed `text-${step}` class would never be generated.
  const steps: [string, string, string][] = [
    ['display', 'text-display', 'Matched on what you do'],
    ['h1', 'text-h1', 'Matched on what you do'],
    ['h2', 'text-h2', 'Matched on what you do'],
    ['h3', 'text-h3', 'Matched on what you do'],
    ['h4', 'text-h4', 'Matched on what you do'],
    ['body-lg', 'text-body-lg', 'Matched on what you actually do, and explicitly do not do.'],
    ['body', 'text-body', 'Matched on what you actually do, and explicitly do not do.'],
    ['body-sm', 'text-body-sm', 'Matched on what you actually do, and explicitly do not do.'],
    ['caption', 'text-caption', 'Matched on what you actually do, and explicitly do not do.'],
  ];
  return (
    <Spec title="Type" note="Every text node uses a step. No ad-hoc sizes anywhere in the app.">
      <div className="space-y-4">
        <p className="eyebrow">Overline · the eyebrow label</p>
        {steps.map(([step, klass, sample]) => (
          <div key={step} className="flex flex-wrap items-baseline gap-4 border-t border-line pt-4">
            <code className="w-24 shrink-0 font-mono text-caption text-ink-muted">{step}</code>
            <p className={`${klass} text-ink`}>{sample}</p>
          </div>
        ))}
      </div>
    </Spec>
  );
}

function Buttons() {
  return (
    <Spec title="Buttons" note="Every variant at every size, plus loading, disabled and icon-only.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Destructive</Button>
          <Button variant="link">Link button</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button icon={IconPlus}>With icon</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>
            Disabled
          </Button>
          <IconButton icon={IconClose} label="Dismiss" />
          <IconButton icon={IconExternal} label="Open in a new tab" />
        </div>
      </div>
    </Spec>
  );
}

function FormFields() {
  return (
    <Spec title="Fields" note="Labels, hints, errors, and the selection controls.">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <FieldShell label="Organization name" htmlFor="ds-a" required>
            <input id="ds-a" className="input" defaultValue="Frederick Community Kitchen" />
          </FieldShell>
          <FieldShell label="Website" htmlFor="ds-b" hint="Used to find the funder's own guidelines.">
            <input id="ds-b" className="input" placeholder="https://" />
          </FieldShell>
          <FieldShell label="EIN" htmlFor="ds-c" error="That EIN is not nine digits.">
            <input id="ds-c" className="input input-invalid" defaultValue="52-11" />
          </FieldShell>
          <FieldShell label="Disabled" htmlFor="ds-d">
            <input id="ds-d" className="input" disabled defaultValue="Not editable" />
          </FieldShell>
          <FieldShell label="What they do NOT do" htmlFor="ds-e">
            <textarea id="ds-e" rows={3} className="input" defaultValue="No direct cash assistance." />
          </FieldShell>
        </div>
        <div className="space-y-5">
          <fieldset>
            <legend className="label">I am…</legend>
            <div className="space-y-2">
              <RadioCard
                name="ds-role"
                label="A non-profit looking for grants"
                description="You will be asked what you do, and what you do not do."
                defaultChecked
              />
              <RadioCard
                name="ds-role"
                label="A funder who gives grants"
                description="You will be asked for your criteria and exclusions."
              />
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Documents on file</legend>
            <div className="space-y-2.5">
              <Checkbox label="Form 990" defaultChecked />
              <Checkbox label="Certificate of good standing" />
              <Checkbox label="IRS determination letter" disabled />
            </div>
          </fieldset>
        </div>
      </div>
    </Spec>
  );
}

function Feedback() {
  return (
    <Spec title="Feedback" note="Callouts and the empty state.">
      <div className="space-y-4">
        <Alert tone="info" title="Research is scheduled">
          This funder was last researched 14 days ago and is queued for a refresh.
        </Alert>
        <Alert tone="success" title="Profile saved">
          Matches will be rescored on the next run.
        </Alert>
        <Alert tone="warning" title="Documentation incomplete">
          Two mandatory documents are missing.
        </Alert>
        <Alert tone="danger" title="Could not reach the model">
          The provider returned a quota error. Nothing was written.
        </Alert>
        <EmptyState
          title="No matches yet"
          hint="Matches appear once a scoring run has been completed for this organization."
          cta={<Button>Run matching</Button>}
        />
      </div>
    </Spec>
  );
}

function VerdictLanguage() {
  const sample = [78, 64, 91, 100, 45, 30];
  return (
    <Spec
      title="Verdicts and dimensions"
      note="Verdict is never carried by colour alone: every one ships an icon and a label. A blocker is drawn as a different category, not a redder score."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <VerdictBadge verdict="APPLY" score={87} />
          <VerdictBadge verdict="MAYBE" score={61} />
          <VerdictBadge verdict="SKIP" score={22} />
          <div className="pt-2">
            <p className="eyebrow mb-2">Score meter</p>
            <div className="space-y-3">
              <ScoreMeter score={88} label="High" />
              <ScoreMeter score={55} label="Middling" />
              <ScoreMeter score={18} label="Low" />
            </div>
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <p className="eyebrow mb-2">The six dimensions</p>
            <ul className="space-y-3">
              {DIMENSIONS.map((dimension, i) => (
                <DimensionRow
                  key={dimension.key}
                  dimensionKey={dimension.key}
                  label={dimension.label}
                  score={sample[i]}
                  note={`Weight ${dimension.weight}.`}
                />
              ))}
            </ul>
          </div>
          <BlockerList
            items={[
              'Funder does not make grants outside Washington County.',
              'Form 990 is not on file, and this funder treats it as mandatory.',
            ]}
          />
        </div>
      </div>
    </Spec>
  );
}

function DataDisplay() {
  return (
    <Spec title="Data display" note="Stat tiles, cards, fields and tags.">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-4">
          <StatTile label="Regional funders" value={11} href="/donors" />
          <StatTile label="Researched live" value={9} />
          <StatTile label="Non-profit profiles" value={2} />
          <StatTile label="Pairings evaluated" value={22} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Operational profile">
            <dl className="space-y-4">
              <Field label="Who they serve" value="Households below 185% of the federal poverty line." />
              <Field label="Who they do NOT serve" value={null} />
            </dl>
          </Card>
          <Card title="Focus areas">
            <div className="space-y-4">
              <Tags items={['Food security', 'Housing', 'Workforce development']} />
              <Tags items={[]} />
            </div>
          </Card>
        </div>
      </div>
    </Spec>
  );
}

function LoadingStates() {
  return (
    <Spec title="Loading" note="What a route shows in the moment before its data arrives.">
      <div className="space-y-5">
        <SkeletonStats />
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard rows={3} />
          <div className="card">
            <div className="card-body space-y-3">
              <SkeletonLine className="h-3 w-1/2" />
              <SkeletonLine className="h-3 w-full" />
              <SkeletonLine className="h-3 w-5/6" />
            </div>
          </div>
        </div>
      </div>
    </Spec>
  );
}
