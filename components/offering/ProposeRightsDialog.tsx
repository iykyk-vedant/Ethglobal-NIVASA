'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertTriangle, FileText, Send } from 'lucide-react';

export interface ProposeRightsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  currentVersion: number;
  initialTerms?: {
    rights_type?: string;
    represents?: string;
    does_not_represent?: string;
    income_entitlement_rule?: string;
    transfer_rule?: string;
    redemption_rule?: string;
    voting_or_control_rights?: string;
    risk_disclosures?: string;
  };
  onSuccess?: () => void;
}

export const ProposeRightsDialog: React.FC<ProposeRightsDialogProps> = ({
  isOpen,
  onClose,
  offeringId,
  currentVersion,
  initialTerms,
  onSuccess,
}) => {
  const [rightsType, setRightsType] = useState(
    initialTerms?.rights_type || 'Commercial Fractional Economic Interest'
  );
  const [represents, setRepresents] = useState(
    initialTerms?.represents ||
      'Simulated fractional economic interest in Godrej Platina Commercial Wing A net rental distributions, subject strictly to the terms of the versioned rights document.'
  );
  const [doesNotRepresent, setDoesNotRepresent] = useState(
    initialTerms?.does_not_represent ||
      'Does NOT represent physical title deed, land registry ownership, encumbrance discharge, or operational property management authority.'
  );
  const [incomeRule, setIncomeRule] = useState(
    initialTerms?.income_entitlement_rule ||
      'Quarterly proportional rental income distribution from verified net commercial lease proceeds.'
  );
  const [transferRule, setTransferRule] = useState(
    initialTerms?.transfer_rule ||
      'Restricted to KYC-verified eligible investors on Hedera Testnet (Chain ID 296).'
  );
  const [redemptionRule, setRedemptionRule] = useState(
    initialTerms?.redemption_rule ||
      '10-year simulated liquidity exit window with scheduled sponsor buyback options.'
  );
  const [votingRights, setVotingRights] = useState(
    initialTerms?.voting_or_control_rights ||
      'Non-voting fractional economic entitlement without management authority.'
  );
  const [riskDisclosures, setRiskDisclosures] = useState(
    initialTerms?.risk_disclosures ||
      'Simulated demonstration asset for technical architecture proof. Not a registered security or public investment.'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/offerings/${offeringId}/rights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': 'e7084862-05bb-4b40-911d-46c56b12f875', // Issuer demo caller
        },
        body: JSON.stringify({
          rights_type: rightsType,
          represents,
          does_not_represent: doesNotRepresent,
          income_entitlement_rule: incomeRule,
          transfer_rule: transferRule,
          redemption_rule: redemptionRule,
          voting_or_control_rights: votingRights,
          risk_disclosures: riskDisclosures,
          simulated_status: 'SIMULATED_DEMO_NON_LEGAL',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to propose new rights version');
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextVersion = currentVersion + 1;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Propose Rights Document (v${nextVersion})`}
      description="Create a new versioned legal and technical rights specification for this offering."
      className="max-w-2xl max-h-[85vh] overflow-y-auto"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Explicit Re-anchoring Warning Alert */}
        <div className="p-3.5 rounded-lg border border-[var(--status-warning)] bg-[var(--surface-sunken)] flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-[var(--status-warning)] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <span className="font-semibold text-[var(--text-primary)]">
              Re-Approval &amp; Re-Anchoring Invariant (ARCH §11.3):
            </span>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Proposing a new rights version transitions the offering back to{' '}
              <strong className="text-[var(--text-primary)]">legal_review_pending</strong>. It will require independent verifier approval and re-anchoring on Hedera ATS before activation. Existing orders remain pinned to the rights version they acknowledged.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded bg-[var(--status-danger)]/10 border border-[var(--status-danger)] text-[var(--status-danger)]">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="font-semibold text-[var(--text-primary)]">Rights Type Specification</label>
          <Input
            value={rightsType}
            onChange={(e) => setRightsType(e.target.value)}
            required
            className="w-full text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-[var(--text-primary)]">What This Token Represents</label>
          <textarea
            value={represents}
            onChange={(e) => setRepresents(e.target.value)}
            rows={2}
            required
            className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
          />
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-[var(--text-primary)]">What This Token Does NOT Represent</label>
          <textarea
            value={doesNotRepresent}
            onChange={(e) => setDoesNotRepresent(e.target.value)}
            rows={2}
            required
            className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-[var(--text-primary)]">Income Entitlement Rule</label>
            <textarea
              value={incomeRule}
              onChange={(e) => setIncomeRule(e.target.value)}
              rows={2}
              required
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[var(--text-primary)]">Transferability Rule</label>
            <textarea
              value={transferRule}
              onChange={(e) => setTransferRule(e.target.value)}
              rows={2}
              required
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-[var(--text-primary)]">Redemption / Exit Rule</label>
            <textarea
              value={redemptionRule}
              onChange={(e) => setRedemptionRule(e.target.value)}
              rows={2}
              required
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-[var(--text-primary)]">Voting &amp; Control Rights</label>
            <textarea
              value={votingRights}
              onChange={(e) => setVotingRights(e.target.value)}
              rows={2}
              required
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="font-semibold text-[var(--text-primary)]">Simulated Risk Disclosures</label>
          <textarea
            value={riskDisclosures}
            onChange={(e) => setRiskDisclosures(e.target.value)}
            rows={2}
            required
            className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-forest)]"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            <span>{isSubmitting ? 'Submitting...' : `Propose Version ${nextVersion}`}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
