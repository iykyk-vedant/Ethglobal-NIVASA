import React from 'react';
import { Badge } from '@/components/ui/Badge';

interface Props {
  version: number;
  status: string;
  merkleRoot: string;
  manifestHash: string;
  completenessPct: string | number;
  approvedAt?: string | null;
  onchainDocTx?: string | null;
}

export function ManifestRootCard({
  version,
  status,
  merkleRoot,
  manifestHash,
  completenessPct,
  approvedAt,
  onchainDocTx,
}: Props) {
  const isApproved = status === 'approved';

  return (
    <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-base text-[var(--text-primary)]">
            Evidence Manifest v{version}
          </span>
          <Badge variant={isApproved ? 'success' : status === 'submitted' ? 'info' : 'neutral'}>
            {status.toUpperCase()}
          </Badge>
        </div>
        <div className="text-xs text-[var(--text-secondary)]">
          Completeness: <strong className="text-[var(--text-primary)] font-mono">{completenessPct}%</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <div className="text-[var(--text-secondary)] font-medium">Merkle Root (Sorted-Pair):</div>
          <div className="p-2.5 rounded bg-[var(--surface-muted)] font-mono text-[11px] text-[var(--brand-primary)] break-all border border-[var(--border)] select-all">
            {merkleRoot}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[var(--text-secondary)] font-medium">Canonical Manifest Hash:</div>
          <div className="p-2.5 rounded bg-[var(--surface-muted)] font-mono text-[11px] text-[var(--text-primary)] break-all border border-[var(--border)] select-all">
            {manifestHash}
          </div>
        </div>
      </div>

      <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)] border-t border-[var(--border)]">
        <div>
          {approvedAt ? (
            <span>Approved by verifier: {new Date(approvedAt).toLocaleString()}</span>
          ) : (
            <span>Status: Awaiting verifier review</span>
          )}
        </div>
        {onchainDocTx && (
          <a
            href={`https://hashscan.io/testnet/transaction/${onchainDocTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--brand-secondary)] hover:underline font-mono"
          >
            HashScan Root Proof →
          </a>
        )}
      </div>
    </div>
  );
}

