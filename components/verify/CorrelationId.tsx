'use client';

import React, { useState } from 'react';
import { Copy, Check, Fingerprint } from 'lucide-react';

export interface CorrelationIdProps {
  id: string;
  label?: string;
  className?: string;
}

export function CorrelationId({
  id,
  label = 'Trace ID',
  className = '',
}: CorrelationIdProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className={`inline-flex items-center gap-1.5 text-[11px] font-mono text-text-secondary ${className}`}>
      <Fingerprint className="w-3.5 h-3.5 text-text-secondary shrink-0" aria-hidden="true" />
      <span>{label}:</span>
      <span className="text-text-primary">{id}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy trace correlation ID"
        className="p-0.5 text-text-secondary hover:text-text-primary rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-focus"
      >
        {copied ? (
          <Check className="w-3 h-3 text-status-success" aria-hidden="true" />
        ) : (
          <Copy className="w-3 h-3" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
