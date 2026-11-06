'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface SignedAcknowledgementPanelProps {
  offeringId: string;
  rightsVersion: number;
  rightsDocumentHash: string;
  units: string;
  unitPriceInr: string;
  totalAmountInr: string;
  walletAddress: string;
  nonce: string;
  expiresAt: string;
  statement: string;
  rawMessage: string;
  signature?: string;
  isSigning: boolean;
  onSign: () => void;
  disabled?: boolean;
  className?: string;
}

export function SignedAcknowledgementPanel({
  offeringId,
  rightsVersion,
  rightsDocumentHash,
  units,
  unitPriceInr,
  totalAmountInr,
  walletAddress,
  nonce,
  expiresAt,
  statement,
  rawMessage,
  signature,
  isSigning,
  onSign,
  disabled = false,
  className = '',
}: SignedAcknowledgementPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`p-3.5 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded space-y-3 ${className}`}
      data-testid="signed-acknowledgement-panel"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
        <span className="text-xs font-semibold text-[var(--text-primary)]">
          Investor Acknowledgement & Demo Rights Version
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] text-[var(--interactive-primary)] hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {copied ? 'Copied terms!' : 'Copy raw message'}
        </button>
      </div>

      {/* Structured terms snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Rights Version:</span>
          <span className="font-semibold text-[var(--text-primary)]">v{rightsVersion}.0</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Rights Hash:</span>
          <span className="text-[var(--text-primary)] truncate max-w-[120px]" title={rightsDocumentHash}>
            {rightsDocumentHash ? `${rightsDocumentHash.slice(0, 10)}...` : 'N/A'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Units:</span>
          <span className="text-[var(--text-primary)]">{units || '0'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Unit Price:</span>
          <span className="text-[var(--text-primary)]">₹{unitPriceInr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Total Amount:</span>
          <span className="text-[var(--text-primary)]">₹{totalAmountInr}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Signing Wallet:</span>
          <span className="text-[var(--text-primary)] truncate max-w-[200px]">
            {walletAddress}
          </span>
        </div>
      </div>

      {/* Explicit Disclaimer */}
      <div className="p-2.5 rounded bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
        &ldquo;{statement}&rdquo;
      </div>

      {/* Signature State or Sign Action */}
      <div className="pt-2 flex items-center justify-between">
        {signature ? (
          <div className="flex items-center gap-2 text-xs text-[var(--status-success)] font-medium">
            <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
            <span>Signature captured from {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={onSign}
            isLoading={isSigning}
            disabled={disabled || isSigning}
            className="w-full text-xs"
            data-testid="sign-acknowledgement-button"
          >
            Sign Acknowledgement with Demo Wallet
          </Button>
        )}
      </div>
    </div>
  );
}
