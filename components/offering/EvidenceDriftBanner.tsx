import React from 'react';

export interface EvidenceDriftBannerProps {
  driftDate?: string;
  className?: string;
}

export function EvidenceDriftBanner({
  driftDate,
  className = '',
}: EvidenceDriftBannerProps) {
  const formattedDate = driftDate
    ? new Date(driftDate).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'recently';

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className={`border rounded-lg p-4 bg-[var(--surface-sunken)] border-[var(--status-danger)] shadow-sm ${className}`}
      data-testid="evidence-drift-banner"
    >
      <div className="flex items-start gap-3">
        <span
          className="text-lg leading-none mt-0.5 text-[var(--status-danger)]"
          aria-hidden="true"
        >
          ⚠️
        </span>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[var(--status-danger)] tracking-wide uppercase">
            Issuance Paused: Evidence Changed on {formattedDate} (Re-Review In Progress)
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            The property evidence manifest was modified after initial approval. Under NIVASA strict
            integrity guardrails (ARCH §17.4), new unit reservations are refused and on-chain ATS
            transfers on Hedera Testnet are paused until an independent verifier conducts a full
            re-review and approves a revised evidence manifest.
          </p>
        </div>
      </div>
    </aside>
  );
}
