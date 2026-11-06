'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (!supabaseUrl || !anonKey) throw new Error('Sign-in is not configured for this deployment.');

      const supabase = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data.session) throw new Error('Email or password is incorrect, or this account is not enabled.');

      const sessionResponse = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token, expiresIn: data.session.expires_in }),
      });
      if (!sessionResponse.ok) throw new Error('Could not establish the secure application session. Please try again.');

      const requestedNext = new URLSearchParams(window.location.search).get('next') || '/issuer';
      const resolvedNext = new URL(requestedNext, window.location.origin);
      const next = resolvedNext.origin === window.location.origin
        ? `${resolvedNext.pathname}${resolvedNext.search}${resolvedNext.hash}`
        : '/issuer';
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto w-full px-4 py-12">
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 sm:p-8 shadow-sm space-y-5">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-[var(--text-secondary)]">Authorized account access</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">Sign in to NIVASA</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Use an account provisioned for your role. Roles are read from the authenticated account; this page does not let you assign yourself a role.</p>
        </div>

        {error && <div role="alert" className="rounded border border-[var(--status-danger)] p-3 text-sm text-[var(--status-danger)]">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)]">Email</label>
            <input id="email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded border border-[var(--border-subtle)] bg-[var(--surface-page)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)]">Password</label>
            <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded border border-[var(--border-subtle)] bg-[var(--surface-page)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]" />
          </div>
          <button type="submit" disabled={busy} className="w-full rounded bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-secondary)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-xs text-[var(--text-secondary)]">Demo access requires an account provisioned by the operator. No password or privileged key is embedded in the page.</p>
        <Link href="/" className="inline-block text-sm font-medium text-[var(--brand-primary)] hover:underline">Return to NIVASA home</Link>
      </div>
    </main>
  );
}
