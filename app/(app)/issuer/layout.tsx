import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/server-session';
import { SignOutButton } from '@/components/auth/SignOutButton';

export const dynamic = 'force-dynamic';

export default async function IssuerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/sign-in?next=%2Fissuer');
  if (!user.roles.includes('issuer') && !user.roles.includes('admin')) redirect('/sign-in?next=%2Fissuer');

  return (
    <div className="min-h-screen bg-[var(--surface-page)]">
      <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 sm:px-6">
        <nav aria-label="Issuer workspace" className="flex items-center gap-4 text-sm">
          <Link href="/" className="font-semibold text-[var(--brand-primary)]">NIVASA</Link>
          <Link href="/issuer" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Workspace</Link>
          <Link href="/issuer/new" className="font-medium text-[var(--brand-primary)] hover:underline">New property</Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[var(--text-secondary)] sm:inline">Signed in as {user.profile.displayName}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
