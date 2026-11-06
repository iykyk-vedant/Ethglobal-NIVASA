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
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold text-[var(--status-danger)] tracking-wide uppercase">
            Issuance paused: evidence changed on {formattedDate}, re-review in progress.
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            New orders are refused immediately (<strong>OFFERING_PAUSED_EVIDENCE</strong>). Under NIVASA fail-closed
            evidence integrity guardrails (ARCH §12, §17.4), issuance stops until an independent verifier re-reviews
            and approves the revised evidence manifest.
          </p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <strong>Hedera ATS Token Pause Semantics (Milestone M1 finding):</strong> As proven on Hedera Testnet
            (<code>docs/ats-gate.md §4.1</code>), ATS v8 <code>Mint.sol</code> decorates issuance with the <code>onlyUnpaused</code> modifier.
            Therefore, pausing the ATS Diamond asset on Hedera halts both <em>primary issuance</em> and <em>holder-to-holder transfers</em> on-chain.
          </p>
        </div>
      </div>
    </aside>
  );
}
