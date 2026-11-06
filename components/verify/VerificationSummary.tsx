'use client';

import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Shield, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { VerificationSummary as IVerificationSummary } from '@/lib/verify/checks';

export interface VerificationSummaryProps {
  summary: IVerificationSummary;
  tokenName: string;
  atsAssetRef: string;
  offeringId: string;
  checkedAt: string;
  className?: string;
}

export function VerificationSummary({
  summary,
  tokenName,
  atsAssetRef,
  offeringId,
  checkedAt,
  className = '',
}: VerificationSummaryProps) {
  return (
    <div
      data-testid="verification-summary"
      className={`bg-surface-card border border-border rounded-lg p-6 shadow-sm space-y-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="warning" className="text-[10px] font-mono uppercase">
              SIMULATED PROTOTYPE
            </Badge>
            <span className="text-xs font-mono text-text-secondary uppercase tracking-wider">
              Network: Hedera Testnet (Chain ID 296)
            </span>
          </div>
          <h2 className="text-2xl font-bold font-serif text-text-primary tracking-tight">
            Cryptographic Integrity Audit
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
            Independent, zero-login public verification of {tokenName} ({atsAssetRef}). Hashes and
            state variables are recomputed and reconciled against Hedera distributed ledger consensus.
          </p>
        </div>

        {/* Aggregate Summary - Never a blanket "verified" badge (ARCH §13, UI §8.9) */}
        <div className="flex flex-col sm:items-end gap-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
            Aggregate Check Status
          </span>
          <div
            data-testid="aggregate-status-badge"
            className="px-3.5 py-1.5 rounded bg-surface-muted border border-border font-mono font-bold text-xs text-text-primary flex items-center gap-2"
          >
            <Shield className="w-4 h-4 text-brand-primary" aria-hidden="true" />
            <span>{summary.summaryText}</span>
          </div>
        </div>
      </div>

      {/* Breakdown Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* PASS Counter */}
        <div className="p-3.5 rounded-md bg-status-success/10 border border-status-success/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-status-success" aria-hidden="true" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">
                Passing Checks
              </span>
              <span className="text-[10px] text-text-secondary">
                Recomputed hashes &amp; state verified
              </span>
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-status-success">
            {summary.passCount}
          </span>
        </div>

        {/* FAIL Counter */}
        <div className="p-3.5 rounded-md bg-status-error/10 border border-status-error/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-5 h-5 text-status-error" aria-hidden="true" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">
                Failing Checks
              </span>
              <span className="text-[10px] text-text-secondary">
                Discrepancy or state mismatch detected
              </span>
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-status-error">
            {summary.failCount}
          </span>
        </div>

        {/* UNAVAILABLE Counter */}
        <div className="p-3.5 rounded-md bg-status-warning/10 border border-status-warning/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-status-warning" aria-hidden="true" />
            <div>
              <span className="text-xs font-semibold text-text-primary block">
                Unavailable Reads
              </span>
              <span className="text-[10px] text-text-secondary">
                Chain read timeout or missing input
              </span>
            </div>
          </div>
          <span className="text-xl font-bold font-mono text-status-warning">
            {summary.unavailableCount}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-text-secondary pt-1 font-mono gap-1">
        <span>Offering ID: {offeringId}</span>
        <span>Audit Timestamp: {checkedAt}</span>
      </div>
    </div>
  );
}
