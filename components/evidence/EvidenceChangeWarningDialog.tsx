import React from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  documentTypeName?: string;
}

export function EvidenceChangeWarningDialog({
  isOpen,
  onConfirm,
  onCancel,
  documentTypeName,
}: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] shadow-xl space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-950/60 text-lg">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">
            Evidence Drift Protocol Warning (D2)
          </h3>
        </div>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Modifying or uploading new evidence {documentTypeName ? `for "${documentTypeName}"` : ''} on an asset with an approved manifest will trigger the <strong>D2 Evidence Drift Protocol</strong>.
        </p>

        <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 space-y-2">
          <div className="font-semibold">Automated System Consequences:</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Any active offering on Hedera Testnet will be immediately <strong>PAUSED</strong> (<code className="font-mono">PAUSED_EVIDENCE_DRIFT</code>).</li>
            <li>New investor unit allocations are blocked until an independent verifier reviews and approves the new manifest version.</li>
            <li>A new Merkle root will be calculated and anchored to the ATS smart contract upon re-approval.</li>
          </ul>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          Are you sure you wish to proceed with uploading this replacement document?
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>
            Acknowledge & Proceed
          </Button>
        </div>
      </div>
    </div>
  );
}
