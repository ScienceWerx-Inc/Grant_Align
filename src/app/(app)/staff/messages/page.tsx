import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/auth';
import { markContactHandled } from '@/lib/contact-actions';
import { Card, EmptyState, PageHeader, StatusPill } from '@/components/ui';

export const dynamic = 'force-dynamic';

/**
 * Enquiries from the public contact form.
 *
 * This page is the reason the form stores rather than emails: there is no mail
 * provider on this deployment, and a form that writes somewhere nobody reads
 * is the same as a form that discards what was typed.
 */
export default async function MessagesPage() {
  // Staff only. These are unsolicited messages from the public, which no
  // seeker or funder organization has any business reading.
  await requireStaff();

  const messages = await prisma.contactMessage.findMany({
    orderBy: [{ handledAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });

  const open = messages.filter(m => !m.handledAt).length;

  return (
    <>
      <PageHeader
        title="Messages"
        subtitle="Enquiries from the public contact form, newest first. Unanswered ones sort to the top."
      />

      {messages.length === 0 ? (
        <EmptyState
          title="No messages yet"
          hint="Anything sent through the contact page arrives here."
        />
      ) : (
        <Card title={`${open} awaiting a reply`}>
          <ul className="divide-y divide-line">
            {messages.map(message => (
              <li key={message.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-ink">
                      {message.name}
                      {message.organization && (
                        <span className="font-normal text-ink-muted"> · {message.organization}</span>
                      )}
                    </p>
                    <a href={`mailto:${message.email}`} className="btn-link">
                      {message.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusPill
                      status={message.handledAt ? 'VERIFIED' : 'PENDING'}
                      label={message.handledAt ? 'handled' : 'open'}
                    />
                    <span className="text-caption tabular-nums text-ink-muted">
                      {message.createdAt.toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>

                <p className="measure mt-3 whitespace-pre-wrap text-body-sm text-ink-body">
                  {message.message}
                </p>

                {!message.handledAt && (
                  <form action={markContactHandled.bind(null, message.id)} className="mt-3">
                    <button type="submit" className="btn-secondary btn-sm">
                      Mark handled
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
