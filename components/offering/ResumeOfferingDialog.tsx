'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface ResumeOfferingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offeringId: string;
  manifestVersion?: number;
  merkleRoot?: string;
  onSuccess?: () => void;
}

export function ResumeOfferingDialog({
  isOpen,
  onClose,
  offeringId,
  manifestVersion,
  merkleRoot,
  onSuccess,
}: ResumeOfferingDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleResume = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/offerings/${offeringId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to initiate offering resumption.');
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Resumption failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-dialog-title"
      aria-describedby="resume-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="resume-offering-dialog"
    >
      <div className="w-full max-w-lg p-6 rounded-xl bg-[var(--surface-primary)] border border-[var(--border-subtle)] shadow-2xl space-y-4">
        <div className="flex items-center gap-3 text-[var(--status-warning)]">
          <span className="text-2xl" aria-hidden="true">
            🔄
          </span>
          <div>
            <h3 id="resume-dialog-title" className="text-base font-bold text-[var(--text-primary)]">
              Resume Offering & Unpause Asset (D2 Protocol)
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Evidence Re-Approval & Hedera Testnet Token Resumption
            </p>
          </div>
        </div>

        <p id="resume-dialog-desc" className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Following independent verifier review and approval of the revised evidence manifest
          {manifestVersion ? ` (v${manifestVersion})` : ''}, this action initiates programmatic on-chain
          resumption of the ATS Diamond security token.
        </p>

        <div className="p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs space-y-2">
          <div className="font-semibold text-[var(--text-primary)]">
            Automated Resumption Sequence (ARCH §12.2):
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-[var(--text-secondary)]">
            <li>
              <strong>On-Chain Document Anchoring:</strong> Anchors new Merkle root{' '}
              <code className="font-mono text-[11px] text-[var(--text-primary)]">
                {merkleRoot ? `${merkleRoot.slice(0, 14)}...` : '(approved root)'}
              </code>{' '}
              via <code>set_manifest_document</code>.
            </li>
            <li>
              <strong>On-Chain Token Unpause:</strong> Executes <code>unpauseAsset()</code> on Hedera Testnet
              using the Pauser key via <code>unpause_asset</code>.
            </li>
            <li>
              <strong>Fail-Closed Gate Verification:</strong> Worker queries Mirror Node to verify both document
              roots and confirms <code>isPaused === false</code> via <code>verify_activation</code>.
            </li>
            <li>
              <strong>Order Flow Restored:</strong> Offering transitions back to <code>active</code>, enabling
              investors to create simulated orders.
            </li>
          </ol>
        </div>

        <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
          <strong>Separation of Duties (ARCH §12.4):</strong> Under NIVASA security rules, the person who uploaded the
          changed evidence cannot resume the offering. Only an independent verifier or administrator can confirm resumption.
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--status-danger)] text-xs text-[var(--status-danger)] flex items-start gap-2"
          >
            <span aria-hidden="true">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleResume}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            data-testid="confirm-resume-button"
          >
            Confirm Resumption & Unpause
          </Button>
        </div>
      </div>
    </div>
  );
}

