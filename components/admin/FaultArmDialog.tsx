'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaultType } from '@/lib/settlement/faults';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

export interface FaultArmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (faultType: FaultType, reason: string, orderId?: string) => Promise<void>;
  targetOrderId?: string;
  isSubmitting?: boolean;
}

const FAULT_DESCRIPTIONS: Record<
  FaultType,
  { label: string; action: string; sideEffect: string }
> = {
  timeout_after_submit: {
    label: 'Timeout After Submit (ARCH §14.2)',
    action: 'Simulate lost response after submitting issuance transaction to Hedera',
    sideEffect:
      'The adapter prepares and submits the issuance transaction to Hedera Testnet, but the worker acts as though the response was dropped. Attempt #1 status becomes UNKNOWN. On the next worker run, the stored transaction ID is queried on Mirror Node, confirmed on consensus, and reconciled. Result: Exactly one allocation, zero double-minting.',
  },
  fail_before_submit: {
    label: 'Fail Before Submit (ARCH §14.2)',
    action: 'Simulate submission error after transaction preparation is persisted',
    sideEffect:
      'The issuance transaction is prepared and persisted in the database as Attempt #1. The submit call immediately throws an error before hitting the network. Attempt #1 status is marked FAILED. The subsequent worker retry creates Attempt #2 with a new transaction ID and proceeds to successful consensus confirmation.',
  },
  duplicate_job: {
    label: 'Duplicate Outbox Job (ARCH §14.3)',
    action: 'Enqueue identical allocate_units job twice with the same dedupe key',
    sideEffect:
      'The outbox engine intercepts the duplicate job via unique (type, dedupe_key) constraint. Only one job executes, and the database unique constraint uq_allocation_attempts_one_confirmed guarantees strictly one on-chain allocation.',
  },
};

export function FaultArmDialog({
  isOpen,
  onClose,
  onConfirm,
  targetOrderId,
  isSubmitting = false,
}: FaultArmDialogProps) {
  const [selectedFault, setSelectedFault] = useState<FaultType>('timeout_after_submit');
  const [reason, setReason] = useState('Manual fault injection demo test');
  const [error, setError] = useState<string | null>(null);

  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      // Focus cancel button by default (UI §10.6: default action is cancel)
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentDesc = FAULT_DESCRIPTIONS[selectedFault];

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('A substantive reason (at least 5 characters) is required for the audit log.');
      return;
    }
    setError(null);
    try {
      await onConfirm(selectedFault, reason.trim(), targetOrderId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to arm fault');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="fault-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[var(--status-warning)] shrink-0" aria-hidden="true" />
            <h2 id="fault-dialog-title" className="text-base font-semibold text-[var(--text-primary)]">
              Arm Demo Fault Injection (UI §10.6)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="p-3 rounded-lg bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/20 text-xs text-[var(--text-primary)] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--status-warning)]">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Simulated Fault Environment Notice</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            This action arms a one-shot fault acting on the <strong>real settlement code path and real Hedera Testnet chain</strong>. Every arming and execution is written to immutable audit logs.
          </p>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4">
          {/* Target Object */}
          <div className="text-xs space-y-1">
            <span className="text-[var(--text-secondary)] font-medium">Target Object:</span>
            <div className="font-mono p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] truncate">
              {targetOrderId ? `Order ${targetOrderId}` : 'Next Investment Order Allocation (Global)'}
            </div>
          </div>

          {/* Fault Type Selection */}
          <div className="space-y-2 text-xs">
            <label htmlFor="fault-type-select" className="block font-medium text-[var(--text-primary)]">
              Fault Type to Inject:
            </label>
            <select
              id="fault-type-select"
              value={selectedFault}
              onChange={(e) => setSelectedFault(e.target.value as FaultType)}
              className="w-full p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none cursor-pointer"
            >
              <option value="timeout_after_submit">timeout_after_submit (Lost response after submit)</option>
              <option value="fail_before_submit">fail_before_submit (Submit error after prepared)</option>
              <option value="duplicate_job">duplicate_job (Duplicate allocate job enqueued)</option>
            </select>
          </div>

          {/* Side Effect Disclosure */}
          <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs space-y-1.5">
            <span className="font-semibold text-[var(--text-primary)] block">
              Expected Side Effect &amp; Recovery:
            </span>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {currentDesc.sideEffect}
            </p>
          </div>

          {/* Audit Reason */}
          <div className="space-y-1.5 text-xs">
            <label htmlFor="fault-reason-input" className="block font-medium text-[var(--text-primary)]">
              Justification / Reason (Written to Audit Log):
            </label>
            <input
              id="fault-reason-input"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Verify timeout recovery via Mirror Node consensus"
              className="w-full p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--status-danger)] font-mono">
              {error}
            </div>
          )}

          {/* Dialog Action Buttons: Cancel is default-focused */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
            <Button
              ref={cancelButtonRef}
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="text-xs bg-[var(--brand-primary)] hover:bg-[var(--brand-hover)] text-white"
            >
              Arm Fault (One-Shot)
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
