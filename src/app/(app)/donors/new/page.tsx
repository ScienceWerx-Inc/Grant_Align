import { createDonor } from '@/lib/actions';
import { Card, PageHeader } from '@/components/ui';
import { requireStaff } from '@/lib/auth';

export default async function NewDonorPage() {
  // Creating organizations is a staff action: self-service would let anyone
  // claim to be a funder and read other non-profits' data.
  await requireStaff();

  // Only staff create organizations; membership is granted, not self-served.
  

  return (
    <>
      <PageHeader
        title="Add a grant giver"
        subtitle="Name and website are enough — the research pass reads the site and the aggregators for the criteria."
      />
      <form action={createDonor}>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Funder name *</label>
              <input id="name" name="name" required className="input" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="website">Website</label>
              <input id="website" name="website" className="input" placeholder="https://" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="mission">About this funder</label>
              <textarea id="mission" name="mission" rows={3} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="city">City</label>
              <input id="city" name="city" className="input" defaultValue="Frederick" />
            </div>
            <div>
              <label className="label" htmlFor="state">State</label>
              <input id="state" name="state" className="input" defaultValue="MD" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="notes">Administrative notes</label>
              <textarea id="notes" name="notes" rows={2} className="input" />
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button type="submit" className="btn-primary">Create donor record</button>
          </div>
        </Card>
      </form>
    </>
  );
}
