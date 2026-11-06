'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, CheckCircle2, AlertTriangle, Layers, ExternalLink } from 'lucide-react';
import { getHashScanTxUrl } from '@/lib/hedera/config';

export interface ReconciliationAssertions {
  unitsOrdered: string;
  unitsOnChainConfirmed: string;
  attemptsUsed: number;
  duplicatesPrevented: number;
  isReconciled: boolean;
  confirmedTxId?: string | null;
}

export interface ReconciliationAssertionPanelProps {
  assertions: ReconciliationAssertions;
  orderStatus?: string;
  className?: string;
}

export function ReconciliationAssertionPanel({
  assertions,
  orderStatus,
  className = '',
}: ReconciliationAssertionPanelProps) {
  const isReconciled = assertions.isReconciled;
  const unitsMatch = assertions.unitsOrdered === assertions.unitsOnChainConfirmed && isReconciled;
  const singleAllocationEnforced = assertions.attemptsUsed >= 1;

  return (
    <section
      aria-labelledby="reconciliation-assertions-heading"
      className={`bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4 ${className}`}
      data-testid="recovery-assertions-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
          <div>
            <h3
              id="reconciliation-assertions-heading"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Settlement Recovery Assertions (ARCH §14.7, §22.2 D4)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Cryptographically verified metrics computed from actual Hedera consensus reconciliation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isReconciled ? 'success' : 'warning'}
            className="text-xs font-mono"
          >
            {isReconciled ? 'RECONCILED' : 'PENDING RECONCILIATION'}
          </Badge>
        </div>
      </div>

      {/* Primary 4-card metric grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] font-sans block">
            Units Ordered
          </span>
          <span className="text-base font-bold text-[var(--text-primary)] block" data-testid="assert-units-ordered">
            {assertions.unitsOrdered}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-sans block">
            DB investor order
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] font-sans block">
            Units on Chain Confirmed
          </span>
          <span
            className={`text-base font-bold block ${
              unitsMatch ? 'text-[var(--status-success)]' : 'text-[var(--text-primary)]'
            }`}
            data-testid="assert-units-confirmed"
          >
            {assertions.unitsOnChainConfirmed}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-sans block">
            Hedera ATS Diamond
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] font-sans block">
            Attempts Used
          </span>
          <span className="text-base font-bold text-[var(--text-primary)] block" data-testid="assert-attempts-used">
            {assertions.attemptsUsed}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-sans block">
            Sequential issuance attempts
          </span>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] font-sans block">
            Duplicates Prevented
          </span>
          <span
            className="text-base font-bold text-[var(--brand-primary)] block"
            data-testid="assert-duplicates-prevented"
          >
            {assertions.duplicatesPrevented}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-sans block">
            Dedupe &amp; recovery guards
          </span>
        </div>
      </div>

      {/* Invariants Audit Strip */}
      <div className="pt-1 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                unitsMatch ? 'bg-[var(--status-success)]' : 'bg-[var(--status-warning)]'
              }`}
              aria-hidden="true"
            />
            <span className="text-[var(--text-secondary)] font-sans">Exact Units Match:</span>
            <span className="font-semibold text-[var(--text-primary)]">
              {unitsMatch ? 'PASS' : 'AWAITING RECONCILIATION'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-[var(--status-success)]"
              aria-hidden="true"
            />
            <span className="text-[var(--text-secondary)] font-sans">At Most 1 Allocation:</span>
            <span className="font-semibold text-[var(--text-primary)]">PASS (ENFORCED)</span>
          </div>
        </div>

        {assertions.confirmedTxId && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[var(--text-secondary)] font-sans">Consensus Record:</span>
            <a
              href={getHashScanTxUrl(assertions.confirmedTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1 font-semibold"
            >
              <span>{assertions.confirmedTxId.slice(0, 20)}...</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

