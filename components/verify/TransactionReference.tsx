import React from 'react';
import { ExternalLink } from 'lucide-react';

export interface TransactionReferenceProps {
  txId: string | null | undefined;
  network?: string;
  label?: string;
  className?: string;
}

export function TransactionReference({
  txId,
  network = 'testnet',
  label = 'Ledger Transaction',
  className = '',
}: TransactionReferenceProps) {
  if (!txId) {
    return (
      <span className="text-xs text-text-secondary font-mono italic">
        Pending ledger submission
      </span>
    );
  }

  // Validate Hedera transaction format: 0.0.x@seconds.nanos or 0.0.x-seconds-nanos
  const isHederaTx = /^\d+\.\d+\.\d+[@-]\d+(\.\d+)?$/.test(txId.trim());

  if (!isHederaTx) {
    return (
      <div className={`inline-flex items-center gap-1.5 font-mono text-xs text-text-secondary ${className}`}>
        <span>{txId}</span>
        <span className="text-[10px] px-1 py-0.2 bg-surface-muted border border-border rounded text-text-secondary font-sans">
          Internal Ref
        </span>
      </div>
    );
  }

  // Format txId for HashScan URL (replace @ and . with dashes if required or direct)
  // HashScan accepts format: 0.0.11330244-1793915457-630080662
  const formattedForUrl = txId.replace('@', '-').replace(/\.(\d+)$/, '-$1');
  const hashScanUrl = `https://hashscan.io/${network}/transaction/${formattedForUrl}`;

  return (
    <div className={`inline-flex flex-col gap-0.5 ${className}`}>
      {label && (
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </span>
      )}
      <a
        href={hashScanUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View transaction ${txId} on HashScan Hedera Testnet explorer (opens in a new tab)`}
        className="inline-flex items-center gap-1 font-mono text-xs text-brand-secondary hover:text-brand-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
      >
        <span>{txId}</span>
        <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
      </a>
    </div>
  );
}
