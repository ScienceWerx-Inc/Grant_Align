import Link from 'next/link';
import { redirect } from 'next/navigation';
import { homePathFor, requireUser } from '@/lib/auth';
import { canSelfOnboard } from '@/lib/auth-rules';
import { cancelJoinRequest, createOwnOrganization, requestToJoin, setOnboardingRole } from '@/lib/auth-actions';
import { getOrganization, listOrganizations } from '@/lib/store';
import { Alert, Card, FieldShell, Overline } from '@/components/ui';
import { AuthForm } from '@/components/AuthForm';
import { ResendVerification } from '@/components/ResendVerification';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up your organization — Grant Align' };

/**
 * Second step of sign-up: an account with no organization gets one.
 *
 * Two ways through, with different trust:
 *  - Create a NEW organization: self-service, because it exposes nobody else's
 *    data. It starts unverified and stays out of matching until staff review.
 *  - Join an EXISTING one: a request staff approve, because membership means
 *    reading that organization's financials and match history.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  if (!canSelfOnboard(user)) redirect(homePathFor(user));

  const isDonor = user.role === 'DONOR';
  const kind = isDonor ? 'DONOR' : 'SEEKER';
  const [requested, existing] = await Promise.all([
    user.requestedOrgId ? getOrganization(user.requestedOrgId) : Promise.resolve(null),
    listOrganizations(kind),
  ]);
  const options = existing.map(o => ({ id: o.id, name: o.name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-band">
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-page items-center justify-between px-6 py-5">
          <Link href="/" className="rounded-control text-h4 font-medium tracking-tight text-ink">
            Grant<span className="text-brand-ink">Align</span>
          </Link>
          <span className="text-caption text-ink-muted">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <Overline>Step 2 of 2</Overline>
        <h1 className="mt-4 text-h1 font-medium tracking-tight text-ink">
          {isDonor ? 'Set up your foundation' : 'Set up your organization'}
        </h1>
        <p className="mt-3 text-body text-ink-muted">
          {isDonor
            ? 'Tell us who you are. You can describe your funding criteria right after, or let the research assistant read them from your website.'
            : 'Tell us who you are. Right after, a short guided interview builds the profile funders are matched against.'}
        </p>

        <form action={setOnboardingRole} className="mt-3 text-body-sm text-ink-muted">
          Signing up as {isDonor ? 'a funder' : 'a non-profit'}.{' '}
          <input type="hidden" name="role" value={isDonor ? 'SEEKER' : 'DONOR'} />
          <button type="submit" className="btn-link">
            I&apos;m {isDonor ? 'a non-profit' : 'a funder'} instead
          </button>
        </form>

        {!user.emailVerified && (
          <div className="mt-6">
            <Alert tone="warning" title="Confirm your email">
              We sent a verification link to {user.email}. You can keep going; the team reviews
              verified accounts first.
              <ResendVerification />
            </Alert>
          </div>
        )}

        {requested ? (
          <div className="mt-8">
            <Card title="Request sent">
              <p className="text-body-sm leading-relaxed text-ink-body">
                You asked to join <span className="font-medium text-ink">{requested.name}</span>. The
                Grant Align team will confirm you work there and grant access; you&apos;ll see it here
                the next time you sign in.
              </p>
              <form action={cancelJoinRequest} className="mt-4">
                <button type="submit" className="btn-secondary">
                  Cancel request
                </button>
              </form>
            </Card>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <Card title={isDonor ? 'Create your foundation' : 'Create your organization'}>
              <AuthForm action={createOwnOrganization} submitLabel="Continue" pendingLabel="Setting up…">
                <FieldShell label={isDonor ? 'Funder name' : 'Organization name'} htmlFor="name" required>
                  <input id="name" name="name" required maxLength={160} className="input" />
                </FieldShell>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldShell label="Website" htmlFor="website">
                    <input id="website" name="website" inputMode="url" placeholder="example.org" className="input" />
                  </FieldShell>
                  {isDonor ? (
                    <FieldShell label="Your title" htmlFor="title">
                      <input id="title" name="title" placeholder="Program officer" className="input" />
                    </FieldShell>
                  ) : (
                    <FieldShell label="EIN" htmlFor="ein" hint="Helps the team verify you faster.">
                      <input id="ein" name="ein" placeholder="52-1234567" className="input" />
                    </FieldShell>
                  )}
                  <FieldShell label="City" htmlFor="city">
                    <input id="city" name="city" autoComplete="address-level2" className="input" />
                  </FieldShell>
                  <FieldShell label="State" htmlFor="state">
                    <input id="state" name="state" autoComplete="address-level1" maxLength={30} className="input" />
                  </FieldShell>
                  {!isDonor && (
                    <div className="sm:col-span-2">
                      <FieldShell label="Your title" htmlFor="title">
                        <input id="title" name="title" placeholder="Executive director" className="input" />
                      </FieldShell>
                    </div>
                  )}
                </div>
                <FieldShell label={isDonor ? 'What you fund' : 'Mission'} htmlFor="mission">
                  <textarea id="mission" name="mission" rows={3} className="input" />
                </FieldShell>
                <p className="text-caption text-ink-muted">
                  New organizations are reviewed by the Grant Align team before they are matched. You can
                  complete your profile in the meantime.
                </p>
              </AuthForm>
            </Card>

            {options.length > 0 && (
              <Card title="Join an existing organization">
                <p className="text-body-sm text-ink-muted">
                  Already listed? Ask for access instead. The team confirms you work there before you can
                  see its records.
                </p>
                <form action={requestToJoin} className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <select name="orgId" required defaultValue="" className="input sm:flex-1" aria-label="Organization">
                    <option value="" disabled>
                      Choose {isDonor ? 'a funder' : 'an organization'}…
                    </option>
                    {options.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="btn-secondary">
                    Request access
                  </button>
                </form>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
