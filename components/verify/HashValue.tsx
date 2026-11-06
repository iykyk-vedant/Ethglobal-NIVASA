'use client';

import React, { useState } from 'react';
import { Copy, Check, Eye } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';

export interface HashValueProps {
  hash: string;
  label?: string;
  shorten?: boolean;
  className?: string;
}

export function HashValue({
  hash,
  label,
  shorten = true,
  className = '',
}: HashValueProps) {
  const [copied, setCopied] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  const displayHash = shorten && hash.length > 16
    ? `${hash.slice(0, 10)}...${hash.slice(-8)}`
    : hash;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      {label && (
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-surface-muted/60 border border-border rounded font-mono text-xs text-text-primary">
        <span title={hash} className="select-all">
          {displayHash}
        </span>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied hash' : 'Copy full hash to clipboard'}
          className="p-1 text-text-secondary hover:text-brand-primary rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-status-success" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        {shorten && hash.length > 16 && (
          <button
            type="button"
            onClick={() => setShowFullModal(true)}
            aria-label="View full cryptographic hash"
            className="p-1 text-text-secondary hover:text-brand-primary rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
          >
            <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      <Dialog
        isOpen={showFullModal}
        onClose={() => setShowFullModal(false)}
        title={label ? `Full Hash: ${label}` : 'Cryptographic Hash'}
        description="Tamper-evident SHA-256 digest verified in the immutable state machine."
      >
        <div className="space-y-4">
          <div className="p-3 bg-surface-muted rounded font-mono text-xs break-all select-all border border-border">
            {hash}
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-primary text-surface-card rounded hover:bg-brand-secondary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-status-success" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Full Hash</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
