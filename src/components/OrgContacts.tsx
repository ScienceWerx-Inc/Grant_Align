import { deleteContact, upsertContact } from '@/lib/actions';
import { Card } from '@/components/ui';
import type { Contact } from '@prisma/client';

export function OrgContacts({ orgId, contacts }: { orgId: string; contacts: Contact[] }) {
  return (
    <Card title="Contacts">
      {contacts.length === 0 ? (
        <p className="field-empty">No contacts recorded.</p>
      ) : (
        <ul className="divide-y divide-line">
          {contacts.map(contact => (
            <li key={contact.id} className="flex items-start gap-3 py-2.5 first:pt-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {contact.name}
                  {contact.isPrimary && <span className="chip ml-2">Primary</span>}
                </p>
                <p className="text-xs text-muted">
                  {[contact.title, contact.email, contact.phone].filter(Boolean).join(' · ') ||
                    'No details'}
                </p>
              </div>
              <form action={deleteContact.bind(null, contact.id)} className="no-print">
                <button type="submit" className="btn-ghost px-2 py-1 text-xs">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={upsertContact.bind(null, orgId)} className="no-print mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <input name="contactName" placeholder="Name" required className="input" />
        <input name="contactTitle" placeholder="Title" className="input" />
        <input name="contactEmail" type="email" placeholder="Email" className="input" />
        <input name="contactPhone" placeholder="Phone" className="input" />
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" name="isPrimary" className="rounded border-line" />
          Primary contact
        </label>
        <div className="flex justify-end">
          <button type="submit" className="btn-secondary">Add contact</button>
        </div>
      </form>
    </Card>
  );
}
