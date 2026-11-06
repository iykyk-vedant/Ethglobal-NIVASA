import React from 'react';
import { ExternalLink, Layers } from 'lucide-react';

export interface ChainReferenceProps {
  chainId?: number;
  contractId?: string | null;
  evmAddress?: string | null;
  assetRef?: string;
  className?: string;
}

export function ChainReference({
  chainId = 296,
  contractId = '0.0.11330441',
  evmAddress = '0x52ed835e649a4b045a21bc5e240623d8a77f73ef',
  assetRef = 'PROPERTY-MH-001',
  className = '',
}: ChainReferenceProps) {
  const hashScanContractUrl = contractId
    ? `https://hashscan.io/testnet/contract/${contractId}`
    : undefined;

  return (
    <div className={`p-3 bg-surface-card rounded-md border border-border space-y-2 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-text-primary flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
          <span>Ledger & Token Contract</span>
        </span>
        <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-status-info/10 text-status-info border border-status-info/30">
          Chain ID {chainId} (Hedera Testnet)
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-text-secondary">
        <div>
          <span className="block text-[10px] uppercase text-text-secondary/80 font-sans">
            ATS Diamond Proxy
          </span>
          {hashScanContractUrl ? (
            <a
              href={hashScanContractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-secondary hover:text-brand-primary hover:underline inline-flex items-center gap-1"
            >
              <span>{contractId}</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          ) : (
            <span>{contractId || '—'}</span>
          )}
        </div>

        <div>
          <span className="block text-[10px] uppercase text-text-secondary/80 font-sans">
            EVM Address
          </span>
          <span className="truncate block" title={evmAddress || ''}>
            {evmAddress ? `${evmAddress.slice(0, 10)}...${evmAddress.slice(-8)}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
