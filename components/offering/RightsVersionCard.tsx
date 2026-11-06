'use client';

import React, { useState } from 'react';
import { Copy, Check, ExternalLink, ShieldCheck, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface RightsVersionCardProps {
  version: number;
  isActive: boolean;
  rightsType: string;
  documentHash: string;
  approvedBy?: string | null;
  approvedAt?: string | null;
  onchainDocTx?: string | null;
  createdAt: string;
  onSelect?: () => void;
}

export const RightsVersionCard: React.FC<RightsVersionCardProps> = ({
  version,
  isActive,
  rightsType,
  documentHash,
  approvedBy,
  approvedAt,
  onchainDocTx,
  createdAt,
  onSelect,
}) => {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard.writeText(documentHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hashScanTxUrl = onchainDocTx
    ? `https://hashscan.io/testnet/transaction/${onchainDocTx.replace('@', '-').replace('.', '-')}`
    : null;

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        isActive
          ? 'border-[var(--brand-forest)] bg-[var(--surface-primary)] shadow-sm'
          : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)] hover:bg-[var(--surface-primary)]'
      }`}
      data-testid={`rights-version-card-v${version}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Rights Specification v{version}
          </span>
          {isActive ? (
            <Badge variant="success" className="text-[10px] uppercase font-mono">
              Active Canonical
            </Badge>
          ) : (
            <Badge variant="neutral" className="text-[10px] uppercase font-mono">
              Superseded / Draft
            </Badge>
          )}
        </div>

        <span className="text-[11px] text-[var(--text-secondary)] font-mono">
          Created: {new Date(createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-3 space-y-2 text-xs">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--text-secondary)]">Type:</span>
          <span className="font-medium text-[var(--text-primary)]">{rightsType}</span>
        </div>

        {/* SHA-256 Hash with Copy */}
        <div className="flex items-center justify-between bg-[var(--surface-sunken)] p-2 rounded border border-[var(--border-subtle)] font-mono text-[11px]">
          <span className="text-[var(--text-secondary)] text-[10px] font-sans">Hash:</span>
          <div className="flex items-center gap-1.5 truncate max-w-[280px]">
            <span className="text-[var(--text-primary)] truncate" title={documentHash}>
              {documentHash}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={copyHash}
              className="p-1 h-6 w-6 shrink-0"
              aria-label="Copy document hash"
            >
              {copied ? <Check className="h-3 w-3 text-[var(--status-success)]" /> : <Copy className="h-3 w-3" />}
            </Button>
          </div>
        </div>

        {/* Review & Chain Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)] pt-1">
          <div>
            <span>Approval: </span>
            <span className="font-medium text-[var(--text-primary)]">
              {approvedAt ? `Approved ${new Date(approvedAt).toLocaleDateString()}` : 'Pending review'}
            </span>
          </div>

          <div>
            <span>Hedera Anchor: </span>
            {hashScanTxUrl ? (
              <a
                href={hashScanTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-forest)] hover:underline inline-flex items-center gap-1 font-mono text-[10px]"
              >
                <span>{onchainDocTx?.slice(0, 16)}...</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : (
              <span className="font-mono text-[10px]">
                {isActive ? 'Confirmed on ATS Diamond' : 'Not anchored'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

