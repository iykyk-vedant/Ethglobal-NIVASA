'use client';

import React from 'react';
import { PieChart, CheckCircle2, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/money/decimal';

export interface SupplySummaryProps {
  maxSupply: number | string;
  chainConfirmedSupply: number | string;
  dbReportedSupply?: number | string;
  unitPriceInr: string;
  isStale?: boolean;
  lastSyncAt?: string;
}

export const SupplySummary: React.FC<SupplySummaryProps> = ({
  maxSupply,
  chainConfirmedSupply,
  dbReportedSupply,
  unitPriceInr,
  isStale = false,
  lastSyncAt,
}) => {
  const maxInt = typeof maxSupply === 'string' ? parseInt(maxSupply, 10) : maxSupply;
  const chainInt = typeof chainConfirmedSupply === 'string' ? parseInt(chainConfirmedSupply, 10) : chainConfirmedSupply;
  const remainingSupply = Math.max(0, maxInt - (isNaN(chainInt) ? 0 : chainInt));

  return (
    <div
      className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-3"
      data-testid="supply-summary"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <PieChart className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Token Supply &amp; Pricing
          </h3>
        </div>
        <Badge variant={isStale ? 'warning' : 'success'} className="text-xs">
          {isStale ? 'Sync Delayed' : 'Chain Confirmed'}
        </Badge>
      </div>

      <div className="space-y-2.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Approved Cap (ATS maxSupply):</span>
          <span className="font-semibold text-[var(--text-primary)] font-mono">
            {maxInt.toLocaleString()} units
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Chain-Confirmed Issued Units:</span>
          <div className="text-right">
            <span className="font-bold text-[var(--status-success)] font-mono block">
              {chainInt.toLocaleString()} units
            </span>
            <span className="text-[10px] text-[var(--text-secondary)] font-sans">
              Read from ATS BalanceTrackerFacet
            </span>
          </div>
        </div>

        {dbReportedSupply !== undefined && (
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-[var(--text-secondary)]">Database-Reported Allocations:</span>
            <span className="text-[var(--text-primary)] font-mono">
              {dbReportedSupply} units
            </span>
          </div>
        )}

        <div className="flex justify-between items-center border-t border-[var(--border-subtle)] pt-2">
          <span className="text-[var(--text-secondary)]">Remaining Available Units:</span>
          <span className="font-bold text-[var(--brand-forest)] font-mono">
            {remainingSupply.toLocaleString()} units
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[var(--text-secondary)]">Unit Price (INR):</span>
          <span className="font-bold text-[var(--text-primary)] font-mono text-sm">
            {formatINR(unitPriceInr)}
          </span>
        </div>
      </div>

      {lastSyncAt && (
        <div className="text-[10px] text-[var(--text-secondary)] font-mono text-right pt-1 border-t border-[var(--border-subtle)]">
          Last Mirror query: {new Date(lastSyncAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

