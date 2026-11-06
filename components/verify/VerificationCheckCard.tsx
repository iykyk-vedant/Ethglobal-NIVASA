'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { HashValue } from './HashValue';
import { TransactionReference } from './TransactionReference';
import { VerificationCheckResult } from '@/lib/verify/checks';

export interface VerificationCheckCardProps {
  check: VerificationCheckResult;
  className?: string;
}

export function VerificationCheckCard({ check, className = '' }: VerificationCheckCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Status-specific badges and border stylings
  const statusConfig = {
    PASS: {
      label: 'PASS',
      badgeVariant: 'success' as const,
      icon: CheckCircle2,
      borderClass: 'border-status-success/30',
      bgHeader: 'bg-status-success/5',
      iconColor: 'text-status-success',
    },
    FAIL: {
      label: 'FAIL',
      badgeVariant: 'danger' as const,
      icon: XCircle,
      borderClass: 'border-status-error/40',
      bgHeader: 'bg-status-error/5',
      iconColor: 'text-status-error',
    },
    UNAVAILABLE: {
      label: 'UNAVAILABLE',
      badgeVariant: 'warning' as const,
      icon: AlertTriangle,
      borderClass: 'border-status-warning/40',
      bgHeader: 'bg-status-warning/5',
      iconColor: 'text-status-warning',
    },
  };

  const currentStatus = statusConfig[check.status] || statusConfig.UNAVAILABLE;
  const StatusIcon = currentStatus.icon;

  const isHash = (val: string | null | undefined): boolean => {
    if (!val) return false;
    const clean = val.startsWith('0x') ? val.slice(2) : val;
    return /^[0-9a-fA-F]{64}$/.test(clean);
  };

  return (
    <div
      data-testid={`verification-check-card-${check.id.toLowerCase()}`}
      className={`bg-surface-card border rounded-lg overflow-hidden shadow-sm transition-colors ${currentStatus.borderClass} ${className}`}
    >
      {/* Card Header */}
      <div className={`p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${currentStatus.bgHeader}`}>
        <div className="flex items-start sm:items-center gap-3">
          <StatusIcon className={`w-5 h-5 shrink-0 mt-0.5 sm:mt-0 ${currentStatus.iconColor}`} aria-hidden="true" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-surface-muted border border-border text-text-primary">
                {check.id}
              </span>
              <h3 className="text-base font-semibold text-text-primary tracking-tight">
                {check.title}
              </h3>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {check.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Explicit text label for PASS / FAIL / UNAVAILABLE */}
          <Badge
            variant={currentStatus.badgeVariant}
            className="text-xs font-mono font-bold uppercase px-2.5 py-1"
          >
            {currentStatus.label}
          </Badge>

          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} technical details for ${check.id}`}
            className="p-1 text-text-secondary hover:text-text-primary rounded hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 space-y-4 text-xs">
        {/* Comparison Row: Expected vs Observed */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
          {/* Expected */}
          <div className="p-3 rounded bg-surface-muted/60 border border-border space-y-1">
            <span className="text-[10px] font-semibold text-text-secondary font-sans uppercase tracking-wider block">
              Expected Reference
            </span>
            <div className="text-text-primary break-all">
              {isHash(check.expected) ? (
                <HashValue hash={check.expected!} shorten={true} />
              ) : (
                <span className="text-xs">{check.expected || 'None specified'}</span>
              )}
            </div>
          </div>

          {/* Observed */}
          <div className="p-3 rounded bg-surface-muted/60 border border-border space-y-1">
            <span className="text-[10px] font-semibold text-text-secondary font-sans uppercase tracking-wider block">
              Observed Value (Hedera / DB)
            </span>
            <div className="text-text-primary break-all">
              {isHash(check.observed) ? (
                <HashValue hash={check.observed!} shorten={true} />
              ) : (
                <span className="text-xs">{check.observed || 'Unavailable'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Evidence & Provenance Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-secondary font-medium">Evidence Reference:</span>
            {check.evidenceUrl ? (
              <a
                href={check.evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-brand-primary hover:underline"
              >
                <span>{check.evidenceRef || 'Inspect Evidence'}</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            ) : check.evidenceRef ? (
              <span className="font-mono text-text-primary">{check.evidenceRef}</span>
            ) : (
              <span className="text-text-secondary italic">No external link required</span>
            )}
          </div>

          <span className="text-text-secondary font-mono text-[11px]">
            Checked: {check.checkedAt}
          </span>
        </div>

        {/* Honest Limitation Statement (UI §8.9, ARCH §13.1) */}
        <div
          role="note"
          className="p-3 rounded bg-surface-muted border border-border flex items-start gap-2 text-xs text-text-secondary"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-text-secondary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-text-primary font-medium">What this check does not prove: </strong>
            {check.limitation}
          </p>
        </div>

        {/* Expandable Technical Details Panel */}
        {expanded && (
          <div
            data-testid={`technical-details-${check.id.toLowerCase()}`}
            className="pt-3 border-t border-border space-y-2 animate-fadeIn"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block font-sans">
              Technical Audit Metadata &amp; Raw Parameters
            </span>
            <pre className="p-3 rounded bg-surface-muted border border-border font-mono text-[11px] text-text-primary overflow-x-auto whitespace-pre-wrap select-all">
              {JSON.stringify(check.technicalDetails, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
