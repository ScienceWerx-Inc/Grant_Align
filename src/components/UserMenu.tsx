'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const ROLE_LABEL: Record<string, string> = {
  SEEKER: 'Grant seeker',
  DONOR: 'Grant giver',
  STAFF: 'Staff',
};

export function UserMenu({
  email,
  role,
  orgName,
}: {
  email: string;
  role: string;
  orgName: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-xs font-medium leading-tight">{orgName ?? ROLE_LABEL[role] ?? role}</p>
        <p className="text-[11px] leading-tight text-muted">
          {ROLE_LABEL[role] ?? role} · {email}
        </p>
      </div>
      <button type="button" onClick={signOut} disabled={busy} className="btn-secondary px-3 py-1.5 text-xs">
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
