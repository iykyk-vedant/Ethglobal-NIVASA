'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreditCard, AlertTriangle, X } from 'lucide-react';
import { formatINR } from '@/lib/money/decimal';

export interface PaymentConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (orderId: string, reason: string) => Promise<void>;
  order: {
    id: string;
    units: string;
    amount_inr?: string;
  } | null;
  isSubmitting?: boolean;
}

export function PaymentConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  order,
  isSubmitting = false,
}: PaymentConfirmDialogProps) {
  const [reason, setReason] = useState('Investor wire transfer verified in demo environment');
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setReason('Investor wire transfer verified in demo environment');
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('A substantive audit reason (at least 5 characters) is required.');
      return;
    }
    setError(null);
    try {
      await onConfirm(order.id, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment confirmation failed');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
            <h2 id="payment-confirm-title" className="text-base font-semibold text-[var(--text-primary)]">
              Confirm Simulated Payment (UI §10.6)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-md"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Simulated disclaimer banner */}
        <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <Badge variant="warning" className="text-[10px] font-mono">
              SIMULATED ACTION
            </Badge>
            <span>Demo Payment Mode</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            This action records a simulated INR bank receipt. No actual banking rail is debited. Disabled in production.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Target & Action Details */}
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Target Order:</span>
              <span className="col-span-2 font-mono text-[var(--text-primary)] truncate">{order.id}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Reserved Units:</span>
              <span className="col-span-2 font-mono font-semibold text-[var(--text-primary)]">
                {order.units} units ({formatINR(order.amount_inr || '0')})
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Action:</span>
              <span className="col-span-2 text-[var(--text-primary)]">
                Transition order to <span className="font-mono font-semibold">PAYMENT_CONFIRMED</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1">
              <span className="text-[var(--text-secondary)] font-medium">Side Effect:</span>
              <span className="col-span-2 text-[var(--text-secondary)]">
                Enqueues an <span className="font-mono text-[var(--text-primary)]">allocate_units</span> outbox job in Postgres, which the background worker executes on Hedera Testnet.
              </span>
            </div>
          </div>

          {/* Reason Input */}
          <div className="space-y-1.5">
            <label htmlFor="payment-confirm-reason" className="text-xs font-semibold text-[var(--text-primary)] block">
              Audit Justification / Reason:
            </label>
            <input
              id="payment-confirm-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Test investor payment confirmation for demo run"
              className="w-full p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
              required
              minLength={5}
            />
          </div>

          {error && (
            <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--status-danger)]/50 rounded-lg text-xs text-[var(--status-danger)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions: UI §10.6 default action is Cancel */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
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
              disabled={isSubmitting}
              className="text-xs"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Simulated Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
