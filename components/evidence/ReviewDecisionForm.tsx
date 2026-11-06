'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface Props {
  propertyId: string;
  manifestId: string;
  manifestVersion: number;
  merkleRoot: string;
  isEligibleVerifier: boolean;
  sodReason?: string;
}

export function ReviewDecisionForm({
  propertyId,
  manifestId,
  manifestVersion,
  merkleRoot,
  isEligibleVerifier,
  sodReason,
}: Props) {
  const router = useRouter();
  const [decision, setDecision] = useState<'verified' | 'rejected' | 'needs_more_information'>('verified');
  const [reason, setReason] = useState('');
  const [limitations, setLimitations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  if (!isEligibleVerifier) {
    return (
      <div className="p-5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 text-xs text-rose-800 dark:text-rose-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-sm">
          <span>⛔</span> Separation of Duties Restriction Active
        </div>
        <p className="leading-relaxed">
          {sodReason || 'You cannot review this submission. The system strictly prohibits an issuer from approving or verifying their own property submission.'}
        </p>
        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-mono">
          SoD Enforcement: Actor role must be an independent verifier distinct from the property issuer.
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setErrorMsg('A substantive justification reason (minimum 10 characters) is required for every review decision.');
      return;
    }
    if (!isConfirmed) {
      setErrorMsg('Please confirm your review decision before submitting.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/properties/${propertyId}/verifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest_id: manifestId,
          decision,
          reason,
          limitations: limitations || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification submission failed');
      }

      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Independent Verification Review
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Decisions are permanently recorded in the append-only verification audit log.
          </p>
        </div>
        <Badge variant="success">Eligible to Review</Badge>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="font-semibold text-[var(--text-primary)] block mb-1.5">
            Review Decision *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setDecision('verified')}
              className={`p-3 rounded-lg border text-left transition-all ${
                decision === 'verified'
                  ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-600/30 font-semibold'
                  : 'border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="text-xs">✓ Approve Manifest</div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-normal">
                Simulated verification approval
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDecision('needs_more_information')}
              className={`p-3 rounded-lg border text-left transition-all ${
                decision === 'needs_more_information'
                  ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 ring-2 ring-amber-600/30 font-semibold'
                  : 'border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="text-xs">⚠️ Needs Information</div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-normal">
                Request updated documents
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className={`p-3 rounded-lg border text-left transition-all ${
                decision === 'rejected'
                  ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 ring-2 ring-rose-600/30 font-semibold'
                  : 'border-[var(--border)] hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]'
              }`}
            >
              <div className="text-xs">✗ Reject Submission</div>
              <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 font-normal">
                Disqualify evidence
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="font-semibold text-[var(--text-primary)] block mb-1">
            Required Justification Reason *
          </label>
          <textarea
            id="review-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain the legal/documentary basis for this verification decision (minimum 10 characters)..."
            aria-describedby="review-reason-guidance"
            className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--focus)]"
          />
          <p id="review-reason-guidance" className="mt-1 text-[11px] text-[var(--text-secondary)]" aria-live="polite">
            {reason.trim().length < 10
              ? `Add at least ${10 - reason.trim().length} more character${10 - reason.trim().length === 1 ? '' : 's'} to enable submission.`
              : `${reason.trim().length} characters entered. Your justification is ready.`}
          </p>
        </div>

        <div>
          <label className="font-semibold text-[var(--text-secondary)] block mb-1">
            Limitation / Scope Qualification (Optional)
          </label>
          <input
            type="text"
            value={limitations}
            onChange={(e) => setLimitations(e.target.value)}
            placeholder="e.g. Scope restricted to registered title; municipal mutation receipt awaited"
            className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
          />
        </div>

        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-start gap-2.5">
          <input
            type="checkbox"
            id="confirm-decision"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="mt-0.5 rounded border-[var(--border)] text-[var(--brand-primary)]"
          />
          <label htmlFor="confirm-decision" className="text-[11px] text-[var(--text-primary)] cursor-pointer select-none">
            I confirm my review decision for <strong>Manifest v{manifestVersion}</strong> (Merkle Root: <code className="font-mono">{merkleRoot.slice(0, 10)}...</code>). This action is permanent and tamper-evident.
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="primary"
            size="sm"
            type="submit"
            isLoading={isSubmitting}
            disabled={!isConfirmed || reason.trim().length < 10}
          >
            Submit Formal Review Decision
          </Button>
        </div>
      </form>
    </div>
  );
}

