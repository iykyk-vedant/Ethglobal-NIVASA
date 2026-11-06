'use client';

import React from 'react';
import { ExternalLink, Layers, ShieldCheck, PauseCircle, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface AtsAssetSummaryProps {
  atsAssetRef: string;
  tokenContractId?: string | null;
  tokenEvmAddress?: string | null;
  chainId?: number;
  isPaused?: boolean;
  internalKycActive?: boolean;
  configurationHash?: string | null;
  lastSyncAt?: string;
}

export const AtsAssetSummary: React.FC<AtsAssetSummaryProps> = ({
  atsAssetRef,
  tokenContractId = '0.0.11330441',
  tokenEvmAddress = '0x52ed835e649a4b045a21bc5e240623d8a77f73ef',
  chainId = 296,
  isPaused = false,
  internalKycActive = true,
  configurationHash,
  lastSyncAt,
}) => {
  const hashScanContractUrl = tokenContractId
    ? `https://hashscan.io/testnet/contract/${tokenContractId}`
    : null;

  return (
    <div
      className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-3"
      data-testid="ats-asset-summary"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Hedera ATS Token Configuration
          </h3>
        </div>
        <Badge variant={isPaused ? 'warning' : 'success'} className="text-xs">
          {isPaused ? 'Asset Paused' : 'Asset Active'}
        </Badge>
      </div>

      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)] font-sans">Network:</span>
          <span className="text-[var(--text-primary)] font-semibold">Hedera Testnet (Chain {chainId})</span>
        </div>

        <div className="flex justify-between">
          <span className="text-[var(--text-secondary)] font-sans">ATS Asset Ref:</span>
          <span className="text-[var(--text-primary)] font-bold">{atsAssetRef}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)] font-sans">ATS Contract ID:</span>
          <span className="text-[var(--text-primary)] font-medium">
            {tokenContractId || '0.0.11330441'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)] font-sans">EVM Address:</span>
          <span className="text-[var(--text-primary)] text-[11px]" title={tokenEvmAddress || ''}>
            {tokenEvmAddress ? `${tokenEvmAddress.slice(0, 10)}...${tokenEvmAddress.slice(-8)}` : 'Pending deployment'}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)] font-sans">KYC Compliance:</span>
          <span className="text-[var(--status-success)] font-sans font-semibold flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            Internal KYC Active
          </span>
        </div>

        {configurationHash && (
          <div className="pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-sans text-[10px] block">Configuration Hash:</span>
            <span className="text-[var(--text-primary)] text-[10px] truncate block" title={configurationHash}>
              {configurationHash}
            </span>
          </div>
        )}

        {hashScanContractUrl && (
          <div className="pt-2">
            <a
              href={hashScanContractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--brand-forest)] hover:underline flex items-center gap-1 font-sans font-medium"
            >
              <span>View Contract on HashScan Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      {lastSyncAt && (
        <div className="text-[10px] text-[var(--text-secondary)] font-mono text-right pt-1 border-t border-[var(--border-subtle)]">
          Last Mirror Node sync: {new Date(lastSyncAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
