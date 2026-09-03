import { addComplianceItem, updateCompliance } from '@/lib/actions';
import { Card } from '@/components/ui';
import { COMPLIANCE_LABELS, REQUIRED_COMPLIANCE } from '@/lib/profile-text';
import type { ComplianceItem, ComplianceType } from '@prisma/client';

const STATUSES = ['MISSING', 'PENDING', 'VERIFIED', 'EXPIRED'] as const;

const STATUS_STYLE: Record<string, string> = {
  MISSING: 'text-skip',
  PENDING: 'text-maybe',
  VERIFIED: 'text-apply',
  EXPIRED: 'text-skip',
};

/**
 * Eligibility and compliance tracking (requirements §2.2).
 *
 * Every item is editable in place rather than behind a modal: this is a
 * checklist somebody works through in one sitting while pulling documents out
 * of a filing cabinet, and a dialog per row would make that miserable.
 */
export function ComplianceCard({ orgId, items }: { orgId: string; items: ComplianceItem[] }) {
  const present = new Set(items.map(i => i.type));
  const addable = (Object.keys(COMPLIANCE_LABELS) as ComplianceType[]).filter(t => !present.has(t));
  const verified = items.filter(i => REQUIRED_COMPLIANCE.includes(i.type) && i.status === 'VERIFIED');

  return (
    <Card
      title="Eligibility & compliance"
      action={
        <span className="text-xs text-muted">
          {verified.length}/{REQUIRED_COMPLIANCE.length} required documents verified
        </span>
      }
    >
      <ul className="space-y-3">
        {items.map(item => (
          <li key={item.id} className="rounded-md border border-line px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {COMPLIANCE_LABELS[item.type]}
                {REQUIRED_COMPLIANCE.includes(item.type) && (
                  <span className="ml-1.5 text-xs font-normal text-muted">required</span>
                )}
              </span>
              <span className={`text-xs font-semibold ${STATUS_STYLE[item.status]}`}>
                {item.status.toLowerCase()}
              </span>
            </div>
            <form
              action={updateCompliance.bind(null, item.id)}
              className="no-print mt-2 grid gap-2 sm:grid-cols-[8rem,8rem,1fr,auto]"
            >
              <select name="status" defaultValue={item.status} className="input">
                {STATUSES.map(status => (
                  <option key={status} value={status}>
                    {status.toLowerCase()}
                  </option>
                ))}
              </select>
              <input
                name="periodLabel"
                defaultValue={item.periodLabel ?? ''}
                placeholder="FY2025"
                className="input"
              />
              <input
                name="documentUrl"
                defaultValue={item.documentUrl ?? ''}
                placeholder="Link to document"
                className="input"
              />
              <button type="submit" className="btn-secondary">Save</button>
            </form>
          </li>
        ))}
      </ul>

      {addable.length > 0 && (
        <form action={addComplianceItem.bind(null, orgId)} className="no-print mt-4 flex gap-2">
          <select name="type" className="input">
            {addable.map(type => (
              <option key={type} value={type}>
                {COMPLIANCE_LABELS[type]}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-secondary whitespace-nowrap">Track document</button>
        </form>
      )}
    </Card>
  );
}
