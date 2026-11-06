'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch('/api/auth/session', { method: 'DELETE' });
    router.replace('/sign-in');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="rounded border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] disabled:opacity-60"
    >
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
