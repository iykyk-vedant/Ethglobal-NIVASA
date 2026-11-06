'use client';

import React from 'react';
import { ShieldAlert, Info, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface RightsSummaryProps {
  version: number;
  rightsType: string;
  rightsDocumentHash: string;
  represents?: string | null;
  doesNotRepresent?: string | null;
  incomeEntitlementRule?: string | null;
  transferRule?: string | null;
  redemptionRule?: string | null;
  votingOrControlRights?: string | null;
  riskDisclosures?: string | null;
  simulatedStatus?: string | null;
  grossYieldFormula?: string;
  onViewFullDoc?: () => void;
}

export const RightsSummary: React.FC<RightsSummaryProps> = ({
  version,
  rightsType,
  rightsDocumentHash,
  represents,
  doesNotRepresent,
  incomeEntitlementRule,
  transferRule,
  redemptionRule,
  votingOrControlRights,
  riskDisclosures,
  simulatedStatus,
  grossYieldFormula = 'Gross Yield = Annual Rent (₹72,00,000) ÷ Valuation (₹10,00,00,000) = 7.20%',
  onViewFullDoc,
}) => {
  const shortHash = rightsDocumentHash
    ? `${rightsDocumentHash.slice(0, 10)}...${rightsDocumentHash.slice(-8)}`
    : 'Not anchored';

  return (
    <div
      className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4"
      data-testid="rights-summary-panel"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Demo Rights Specification (v{version})
            </h2>
            <Badge variant="info" className="text-[10px] font-mono uppercase">
              {simulatedStatus || 'SIMULATED DEMO'}
            </Badge>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Legal specification and rights parameters for simulated unit allocation.
          </p>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-[var(--text-secondary)] font-mono block">Document Hash:</span>
          <span className="text-xs font-mono text-[var(--text-primary)] font-medium" title={rightsDocumentHash}>
            {shortHash}
          </span>
        </div>
      </div>

      {/* Represents vs Does NOT Represent (Two Column Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* What This Token Represents */}
        <div className="p-4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--status-success)]">
            <span className="h-2 w-2 rounded-full bg-[var(--status-success)] shrink-0" aria-hidden="true" />
            <span>What This Token Represents</span>
          </div>
          <p className="text-[var(--text-primary)] leading-relaxed">
            {represents ||
              'Simulated fractional economic interest in Godrej Platina Commercial Wing A net rental distributions, subject strictly to the terms of the versioned rights document.'}
          </p>
          <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Income Entitlement: </span>
            {incomeEntitlementRule || 'Quarterly proportional rental distribution.'}
          </div>
        </div>

        {/* What This Token Does NOT Represent */}
        <div className="p-4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--status-danger)]">
            <span className="h-2 w-2 rounded-full bg-[var(--status-danger)] shrink-0" aria-hidden="true" />
            <span>What This Token Does NOT Represent</span>
          </div>
          <p className="text-[var(--text-primary)] leading-relaxed">
            {doesNotRepresent ||
              'Does NOT represent physical title deed, land registry ownership, encumbrance discharge, or operational property management authority.'}
          </p>
          <div className="pt-1 text-[11px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Voting &amp; Control: </span>
            {votingOrControlRights || 'Non-voting fractional economic entitlement without management authority.'}
          </div>
        </div>
      </div>

      {/* Yield Derivation Formula & Financial Disclosure */}
      <div className="p-3.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]">
          <Info className="h-3.5 w-3.5 text-[var(--brand-forest)]" aria-hidden="true" />
          <span>Gross Yield Derivation Formula:</span>
        </div>
        <div className="font-mono text-[11px] text-[var(--text-primary)] bg-[var(--surface-primary)] p-2 rounded border border-[var(--border-subtle)]">
          {grossYieldFormula}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] italic">
          *Gross yield calculation only (Rent ÷ Valuation). Does not account for property management expenses, taxes, or vacancy. Never constitutes a guaranteed return or financial forecast.
        </p>
      </div>

      {/* Transfer & Liquidity Rules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
        <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold block">Transferability</span>
          <span className="text-[var(--text-primary)] font-medium mt-0.5 block">
            {transferRule || 'Restricted to KYC-verified eligible investor wallets on Hedera Testnet (Chain ID 296).'}
          </span>
        </div>

        <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold block">Redemption &amp; Liquidity</span>
          <span className="text-[var(--text-primary)] font-medium mt-0.5 block">
            {redemptionRule || '10-year simulated liquidity exit window with scheduled sponsor buyback options.'}
          </span>
        </div>
      </div>

      {/* Risk Disclosures */}
      <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
          <ShieldAlert className="h-3.5 w-3.5 text-[var(--status-warning)]" aria-hidden="true" />
          <span>Demonstration Risk Disclosures:</span>
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {riskDisclosures ||
            'This tokenization is an educational and architectural prototype on Hedera Testnet and does not constitute a public investment offering, securities issuance, or financial advice. All valuation, rental yields, and cash flows are simulated demonstration data.'}
        </p>
      </div>

      {/* Bottom Re-versioning & Re-anchoring Notice */}
      <div className="text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)] pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p>
          <strong className="text-[var(--text-primary)]">Re-anchoring Invariant (ARCH §11.3): </strong>
          Any change to rights requires independent re-approval and on-chain re-anchoring. Existing orders stay pinned to the version the investor signed.
        </p>
      </div>
    </div>
  );
};

