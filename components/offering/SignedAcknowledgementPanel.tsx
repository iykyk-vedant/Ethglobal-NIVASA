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
      className={`border border-[var(--border-subtle)] rounded-lg p-4 bg-[var(--surface-sunken)] space-y-3 ${className}`}
      data-testid="signed-acknowledgement-panel"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
          Investor EIP-191 Acknowledgement (ARCH §15.2)
        </h4>
        <button
          type="button"
          onClick={handleCopy}
          className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors underline"
        >
          {copied ? 'Copied message!' : 'Copy raw text'}
        </button>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        Prior to order reservation, your bound wallet must sign the deterministic terms below.
        The server verifies this cryptographic signature against current database values before locking units.
      </p>

      {/* Structured terms presentation */}
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded p-3 text-xs space-y-1.5 font-mono text-[11px]">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Offering ID:</span>
          <span className="text-[var(--text-primary)]">{offeringId}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Rights Version:</span>
          <span className="text-[var(--text-primary)]">v{rightsVersion}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Rights Hash:</span>
          <span className="text-[var(--text-primary)] truncate max-w-[200px]" title={rightsDocumentHash}>
            {rightsDocumentHash.slice(0, 10)}...{rightsDocumentHash.slice(-8)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Units to Reserve:</span>
          <span className="text-[var(--text-primary)] font-bold">{units}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)]">Unit Price:</span>
          <span className="text-[var(--text-primary)]">₹{unitPriceInr}</span>
        </div>
        <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5 font-sans font-semibold text-xs">
          <span className="text-[var(--text-primary)]">Total Order Amount:</span>
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
            disabled={isSigning}
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
