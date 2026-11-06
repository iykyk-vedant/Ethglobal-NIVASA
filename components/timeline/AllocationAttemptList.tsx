'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { getHashScanTxUrl } from '@/lib/hedera/config';

export interface AllocationAttempt {
  id: string;
  attempt_no: number;
  chain_tx_id?: string | null;
  signed_tx_hash?: string | null;
  status: 'prepared' | 'submitted' | 'confirmed' | 'failed' | 'unknown' | string;
  error?: string | null;
  created_at: string;
  confirmed_at?: string | null;
}

export interface AllocationAttemptListProps {
  attempts: AllocationAttempt[];
  className?: string;
}

export function AllocationAttemptList({
  attempts,
  className = '',
}: AllocationAttemptListProps) {
  if (!attempts || attempts.length === 0) {
    return (
      <div
        className={`border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--surface-primary)] text-xs text-[var(--text-secondary)] italic text-center ${className}`}
        data-testid="allocation-attempts-empty"
      >
        No on-chain allocation attempts recorded yet. Awaiting payment confirmation.
      </div>
    );
  }

  return (
    <div
      className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-3 ${className}`}
      data-testid="allocation-attempt-list"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Hedera Allocation Attempts (ARCH §14.2)
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Database-persisted issuance attempts. Invariant: At most one confirmed attempt per order.
          </p>
        </div>
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          Total attempts: {attempts.length}
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {attempts.map((attempt) => {
          const isUnknown = attempt.status === 'unknown';
          const isConfirmed = attempt.status === 'confirmed';
          const isFailed = attempt.status === 'failed';

          return (
            <div
              key={attempt.id || attempt.attempt_no}
              className={`p-3 rounded-lg border text-xs space-y-2 transition-colors ${
                isConfirmed
                  ? 'border-[var(--status-success)]/40 bg-[var(--surface-elevated)]'
                  : isUnknown
                  ? 'border-[var(--status-warning)]/40 bg-[var(--surface-sunken)]'
                  : isFailed
                  ? 'border-[var(--status-danger)]/40 bg-[var(--surface-sunken)]'
                  : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--text-primary)]">
                  Attempt #{attempt.attempt_no}
                </span>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      isConfirmed
                        ? 'success'
                        : isUnknown
                        ? 'warning'
                        : isFailed
                        ? 'danger'
                        : 'info'
                    }
                    className="text-[10px] font-mono"
                  >
                    {isUnknown ? 'Checking transaction outcome' : attempt.status}
                  </Badge>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {attempt.confirmed_at || attempt.created_at}
                  </span>
                </div>
              </div>

              {/* Transaction ID & HashScan Link */}
              {attempt.chain_tx_id ? (
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  <span className="text-[var(--text-secondary)]">Chain Tx ID:</span>
                  <a
                    href={getHashScanTxUrl(attempt.chain_tx_id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--brand-forest)] hover:underline truncate max-w-[280px]"
                    title={attempt.chain_tx_id}
                  >
                    {attempt.chain_tx_id} ↗
                  </a>
                </div>
              ) : (
                <div className="text-[11px] text-[var(--text-secondary)] italic">
                  Prepared transaction payload committed before chain broadcast.
                </div>
              )}

              {/* Status explanation */}
              {isUnknown && (
                <p className="text-[11px] text-[var(--text-secondary)] italic">
                  Broadcast timeout. Worker queries Mirror Node to verify on-chain consensus before creating any further attempt.
                </p>
              )}

              {isFailed && attempt.error && (
                <p className="text-[11px] text-[var(--status-danger)] font-mono">
                  Error: {attempt.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
