'use client';

import React from 'react';
import { OrderStatus } from '@/lib/state/transitions';
import { Badge } from '@/components/ui/Badge';
import { getHashScanTxUrl } from '@/lib/hedera/config';

export interface TimelineEvent {
  status: OrderStatus | string;
  label: string;
  timestamp: string;
  source: 'application' | 'simulated_payment' | 'worker' | 'hedera_receipt' | 'mirror_node' | 'reconciliation';
  isCurrent: boolean;
  isComplete: boolean;
  txId?: string | null;
  note?: string | null;
}

export interface SettlementTimelineProps {
  currentStatus: OrderStatus | string;
  createdAt: string;
  updatedAt: string;
  simulatedPaymentRef?: string | null;
  attempts?: Array<{
    attempt_no: number;
    chain_tx_id?: string | null;
    status: string;
    created_at: string;
    confirmed_at?: string | null;
    error?: string | null;
  }>;
  className?: string;
}

const CANONICAL_STEPS: Array<{
  status: OrderStatus;
  label: string;
  source: TimelineEvent['source'];
}> = [
  { status: 'UNITS_RESERVED', label: 'Units Reserved', source: 'application' },
  { status: 'PAYMENT_PENDING', label: 'Payment Pending', source: 'application' },
  { status: 'PAYMENT_CONFIRMED', label: 'Payment Confirmed', source: 'simulated_payment' },
  { status: 'ALLOCATION_PENDING', label: 'Allocation Enqueued', source: 'worker' },
  { status: 'ALLOCATION_SUBMITTED', label: 'Transaction Submitted to Hedera', source: 'worker' },
  { status: 'ALLOCATION_CONFIRMED', label: 'Consensus Receipt & Mirror Ingestion', source: 'hedera_receipt' },
  { status: 'COMPLETED', label: 'Reconciled & Completed', source: 'reconciliation' },
];

export function SettlementTimeline({
  currentStatus,
  createdAt,
  updatedAt,
  simulatedPaymentRef,
  attempts = [],
  className = '',
}: SettlementTimelineProps) {
  // Determine if order is in an exception state
  const isException = [
    'PAYMENT_FAILED',
    'ALLOCATION_FAILED',
    'REFUND_PENDING',
    'REFUNDED',
    'RECONCILIATION_REQUIRED',
    'MANUAL_REVIEW',
    'REJECTED',
    'EXPIRED',
  ].includes(currentStatus);

  const confirmedAttempt = attempts.find((a) => a.status === 'confirmed');
  const latestAttempt = attempts[attempts.length - 1];

  // Helper to determine step completion index
  const currentStepIndex = CANONICAL_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <div
      className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4 ${className}`}
      data-testid="settlement-timeline"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Settlement Timeline &amp; State Audit
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cryptographically provable Hedera Testnet allocation lifecycle (ARCH §14.7).
          </p>
        </div>
        <Badge
          variant={
            currentStatus === 'COMPLETED'
              ? 'success'
              : isException
              ? 'danger'
              : 'warning'
          }
        >
          {currentStatus}
        </Badge>
      </div>

      {/* Screen reader live region announcing status updates without stealing focus */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="aria-status-announcer"
      >
        Settlement status is currently {currentStatus}.
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4 pt-2">
        {CANONICAL_STEPS.map((step, idx) => {
          let isComplete = false;
          let isCurrent = false;

          if (!isException) {
            isComplete = currentStepIndex >= idx;
            isCurrent = currentStepIndex === idx;
          } else {
            // For exceptions, complete steps prior to failure point
            isComplete = idx <= 2 && ['PAYMENT_CONFIRMED', 'ALLOCATION_PENDING', 'ALLOCATION_SUBMITTED'].some(s => attempts.length > 0);
          }

          const txIdForStep =
            step.status === 'ALLOCATION_SUBMITTED'
              ? latestAttempt?.chain_tx_id
              : step.status === 'ALLOCATION_CONFIRMED' || step.status === 'COMPLETED'
              ? confirmedAttempt?.chain_tx_id
              : null;

          return (
            <div key={step.status} className="relative flex items-start gap-3.5 group">
              {/* Connecting vertical bar */}
              {idx < CANONICAL_STEPS.length - 1 && (
                <div
                  className={`absolute left-[13px] top-[26px] bottom-[-16px] w-0.5 transition-colors ${
                    isComplete && !isCurrent
                      ? 'bg-[var(--status-success)]'
                      : 'bg-[var(--border-subtle)]'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Indicator Circle */}
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${
                  isComplete
                    ? 'bg-[var(--status-success)] text-white'
                    : isCurrent
                    ? 'border-2 border-[var(--brand-forest)] bg-[var(--surface-primary)] text-[var(--brand-forest)]'
                    : 'border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)]'
                }`}
                aria-hidden="true"
              >
                {isComplete ? (
                  <span className="text-xs font-bold leading-none">✓</span>
                ) : (
                  <span className="text-xs font-mono">{idx + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {step.label}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                    {isCurrent ? updatedAt : isComplete ? createdAt : 'Pending'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[var(--text-secondary)]">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] font-mono text-[10px]">
                    Source: {step.source}
                  </span>
                  <span className="font-mono text-[10px]">
                    Canonical: {step.status}
                  </span>
                </div>

                {/* Simulated Payment Ref Info */}
                {step.status === 'PAYMENT_CONFIRMED' && simulatedPaymentRef && (
                  <div className="mt-1 text-[11px] font-mono text-[var(--text-secondary)]">
                    Payment Ref: <span className="text-[var(--text-primary)]">{simulatedPaymentRef}</span>
                  </div>
                )}

                {/* Hedera Transaction HashScan Link */}
                {txIdForStep && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                    <span className="text-[var(--text-secondary)]">Hedera Tx:</span>
                    <a
                      href={getHashScanTxUrl(txIdForStep)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[var(--brand-forest)] hover:underline truncate max-w-[280px]"
                      title={txIdForStep}
                    >
                      {txIdForStep} ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Exception State Banner if Order deviated from happy path */}
        {isException && (
          <div
            role="alert"
            className="mt-4 p-3.5 rounded-lg border border-[var(--status-danger)] bg-[var(--surface-sunken)] text-xs text-[var(--status-danger)] space-y-1"
          >
            <div className="font-bold flex items-center gap-1.5">
              <span>⚠️</span>
              <span>Exception State: {currentStatus}</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {currentStatus === 'MANUAL_REVIEW'
                ? 'Order has been routed to compliance manual review due to pre-allocation validation failure.'
                : currentStatus === 'RECONCILIATION_REQUIRED'
                ? 'On-chain evidence differs from expected unit count; pending operator reconciliation.'
                : 'Settlement execution did not complete normally. Order is preserved for refund or review.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
