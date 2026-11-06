'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export interface ReceiptLinkCardProps {
  receiptToken: string;
  orderId: string;
  orderStatus: string;
  className?: string;
}

export function ReceiptLinkCard({
  receiptToken,
  orderId,
  orderStatus,
  className = '',
}: ReceiptLinkCardProps) {
  const [copied, setCopied] = useState(false);

  // Expose ONLY for COMPLETED orders per Task 5 & ARCH §15.3
  if (orderStatus !== 'COMPLETED' || !receiptToken) {
    return null;
  }

  const receiptUrl = `/verify/receipt/${receiptToken}`;

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      const fullUrl = `${window.location.origin}${receiptUrl}`;
      navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-3 ${className}`}
      data-testid="receipt-link-card"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>Proof of Settlement Receipt</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-success)]/10 text-[var(--status-success)] font-medium">
              Verified
            </span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Shareable public verification proving on-chain allocation without revealing personal data (ARCH §15.3).
          </p>
        </div>
      </div>

      <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1.5 font-mono text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Receipt Token:</span>
          <span className="text-[var(--text-primary)] font-semibold truncate max-w-[200px]">
            {receiptToken}
          </span>
        </div>
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-[var(--text-secondary)]">Public Receipt Path:</span>
          <span className="text-[var(--text-primary)] truncate max-w-[240px]">
            {receiptUrl}
          </span>
        </div>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        This receipt cryptographically confirms that unit issuance reached consensus on Hedera Testnet,
        matches the versioned rights document hash, and reconciled with the token supply.
      </p>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link href={receiptUrl} className="flex-1 min-w-[150px]">
          <Button variant="primary" className="w-full text-xs font-semibold" data-testid="view-receipt-button">
            View Settlement Receipt ↗
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyLink}
          className="text-xs"
          data-testid="copy-receipt-link-button"
        >
          {copied ? 'Link Copied!' : 'Copy Verification URL'}
        </Button>
      </div>
    </div>
  );
}
