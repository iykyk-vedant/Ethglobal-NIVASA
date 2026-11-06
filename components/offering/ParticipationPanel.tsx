'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';

export interface ParticipationPanelProps {
  offeringId: string;
  offeringStatus: string;
  isWalletVerified: boolean;
  walletAddress?: string | null;
  eligibilityStatus?: string | null;
  chainStatus?: string | null;
  rightsDocumentSummary: {
    version: number;
    rightsType: string;
    hash: string;
    incomeRule: string;
    transferRule: string;
    redemptionRule: string;
    votingRule: string;
    riskDisclosures: string;
  };
  onOrderClick?: () => void;
  className?: string;
}

export function ParticipationPanel({
  offeringId,
  offeringStatus,
  isWalletVerified,
  walletAddress,
  eligibilityStatus,
  chainStatus,
  rightsDocumentSummary,
  onOrderClick,
  className = '',
}: ParticipationPanelProps) {
  const [rightsOpen, setRightsOpen] = useState(false);

  const isEligibleAndRegistered =
    isWalletVerified &&
    eligibilityStatus === 'eligible' &&
    chainStatus === 'registered';

  const isOfferingActive = offeringStatus === 'active';
  const canCreateOrder = isEligibleAndRegistered && isOfferingActive;

  return (
    <div
      className={`border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4 ${className}`}
      data-testid="participation-panel"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">
          Investor Participation
        </h3>
        <Badge variant={canCreateOrder ? 'success' : 'warning'} className="text-[11px]">
          {canCreateOrder ? 'Order Pre-Conditions Met' : 'Action Required'}
        </Badge>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
        NIVASA strictly enforces permissioned access at the database and Hedera smart contract layers.
        Participation is simulated and uses Hedera Testnet tokens with no real financial investment or land conveyance.
      </p>

      {/* Pre-Condition Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider block">
            1. Bound Wallet Proof
          </span>
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                isWalletVerified ? 'bg-[var(--status-success)]' : 'bg-[var(--status-warning)]'
              }`}
            />
            <span>
              {isWalletVerified
                ? `Verified (${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)})`
                : 'Not verified'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wider block">
            2. Tier Accreditation & ATS KYC
          </span>
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={`h-2 w-2 rounded-full ${
                isEligibleAndRegistered ? 'bg-[var(--status-success)]' : 'bg-[var(--status-warning)]'
              }`}
            />
            <span>
              {eligibilityStatus === 'eligible'
                ? chainStatus === 'registered'
                  ? 'Accredited & Chain-Registered'
                  : 'Approved (Syncing on Hedera)'
                : eligibilityStatus === 'pending'
                ? 'Review Pending'
                : 'Not requested'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2.5 pt-2">
        {!isWalletVerified && (
          <Link href="/investor/wallet" className="flex-1 min-w-[160px]">
            <Button variant="secondary" className="w-full text-xs" data-testid="connect-wallet-button">
              Connect Demo Wallet
            </Button>
          </Link>
        )}

        {isWalletVerified && !isEligibleAndRegistered && (
          <Link href="/investor/wallet" className="flex-1 min-w-[160px]">
            <Button variant="secondary" className="w-full text-xs" data-testid="request-eligibility-button">
              Request Eligibility Review
            </Button>
          </Link>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setRightsOpen(true)}
          className="text-xs"
          data-testid="review-rights-button"
        >
          Review Demo Rights (v{rightsDocumentSummary.version})
        </Button>

        {canCreateOrder && onOrderClick && (
          <Button
            type="button"
            variant="primary"
            onClick={onOrderClick}
            className="flex-1 min-w-[160px] text-xs font-semibold"
            data-testid="create-order-button"
          >
            Create Simulated Order
          </Button>
        )}
      </div>

      {/* Demo Rights Inspection Dialog */}
      <Dialog
        isOpen={rightsOpen}
        onClose={() => setRightsOpen(false)}
        title={`Demo Rights Document Summary — v${rightsDocumentSummary.version}`}
        description="Exact terms governed by the current versioned rights document anchored on Hedera."
      >
        <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <div className="p-3 rounded bg-[var(--surface-sunken)] font-mono text-[11px] space-y-1">
            <div className="flex justify-between">
              <span>Rights Type:</span>
              <span className="text-[var(--text-primary)] font-sans">{rightsDocumentSummary.rightsType}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>SHA-256 Hash:</span>
              <span className="text-[var(--text-primary)] truncate max-w-[240px]" title={rightsDocumentSummary.hash}>
                {rightsDocumentSummary.hash}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">What this token represents:</h4>
              <p>{rightsDocumentSummary.incomeRule}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">What this token does NOT represent:</h4>
              <p>{rightsDocumentSummary.votingRule}. Does not represent legal title, deed ownership of land, or voting control of physical property.</p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">Transfer Restrictions:</h4>
              <p>{rightsDocumentSummary.transferRule}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">Redemption & Liquidity:</h4>
              <p>{rightsDocumentSummary.redemptionRule}</p>
            </div>
            <div>
              <h4 className="font-semibold text-[var(--text-primary)] mb-0.5">Disclosures:</h4>
              <p className="italic">{rightsDocumentSummary.riskDisclosures}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button variant="secondary" onClick={() => setRightsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
