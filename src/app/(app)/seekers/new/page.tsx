import { createSeeker } from '@/lib/actions';
import { Card, PageHeader } from '@/components/ui';
import { requireStaff } from '@/lib/auth';

export default async function NewSeekerPage() {
  // Creating organizations is a staff action: self-service would let anyone
  // claim to be a funder and read other non-profits' data.
  await requireStaff();

  // Only staff create organizations; membership is granted, not self-served.
  

  return (
    <>
      <PageHeader
        title="Add a non-profit"
        subtitle="Just the CRM basics — the AI interviewer fills in the operational detail afterwards."
      />
      <form action={createSeeker}>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Organization name *</label>
              <input id="name" name="name" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="ein">EIN</label>
              <input id="ein" name="ein" className="input" placeholder="52-1234567" />
            </div>
            <div>
              <label className="label" htmlFor="website">Website</label>
              <input id="website" name="website" className="input" placeholder="https://" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="mission">Mission statement (as published)</label>
              <textarea id="mission" name="mission" rows={3} className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="addressLine">Street address</label>
              <input id="addressLine" name="addressLine" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" className="input" defaultValue="Frederick" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="state">State</label>
                <input id="state" name="state" className="input" defaultValue="MD" />
              </div>
              <div>
                <label className="label" htmlFor="postalCode">ZIP</label>
                <input id="postalCode" name="postalCode" className="input" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone</label>
              <input id="phone" name="phone" className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Administrative notes</label>
              <textarea id="notes" name="notes" rows={2} className="input" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" className="btn-primary">Create profile</button>
          </div>
        </Card>
      </form>
    </>
  );
}
