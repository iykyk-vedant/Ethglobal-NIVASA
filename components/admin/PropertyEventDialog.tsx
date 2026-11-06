'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sparkles, AlertTriangle, X } from 'lucide-react';

export interface PropertyEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (propertyId: string, eventId: string, reason: string) => Promise<void>;
  propertyId?: string;
  isSubmitting?: boolean;
}

export function PropertyEventDialog({
  isOpen,
  onClose,
  onConfirm,
  propertyId = '11111111-1111-1111-1111-111111111111',
  isSubmitting = false,
}: PropertyEventDialogProps) {
  const [selectedEventId, setSelectedEventId] = useState('event-mh-001-valuation-increase');
  const [reason, setReason] = useState('Applying scripted ARCH §16.3 appraisal update for demo verification');
  const [error, setError] = useState<string | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setReason('Applying scripted ARCH §16.3 appraisal update for demo verification');
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      setError('A substantive audit reason (at least 5 characters) is required.');
      return;
    }
    setError(null);
    try {
      await onConfirm(propertyId, selectedEventId, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to apply property event');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="property-event-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 text-left">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--brand-primary)] shrink-0" aria-hidden="true" />
            <h2 id="property-event-title" className="text-base font-semibold text-[var(--text-primary)]">
              Apply Scripted Property Event (UI §10.6, ARCH §16.3)
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

        {/* Disclaimer banner */}
        <div className="p-3 bg-[var(--surface-sunken)] border border-[var(--border-subtle)] rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text-primary)]">
            <Badge variant="warning" className="text-[10px] font-mono">
              SIMULATED ACTION
            </Badge>
            <span>Scripted Demo Event Mode</span>
          </div>
          <p className="text-[var(--text-secondary)]">
            Appends an immutable simulated snapshot row (#2) to Postgres. Strictly disabled in production.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-xs">
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Target Property:</span>
              <span className="col-span-2 font-mono text-[var(--text-primary)] truncate">{propertyId}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Scripted Scenario:</span>
              <span className="col-span-2 text-[var(--text-primary)] font-medium">
                Valuation: ₹10.50 Cr (+5%) · Occupancy: 85% (-10%)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1 border-b border-[var(--border-subtle)]">
              <span className="text-[var(--text-secondary)] font-medium">Action:</span>
              <span className="col-span-2 text-[var(--text-primary)]">
                Append Snapshot #2 (provenance: &apos;simulated&apos;)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 py-1">
              <span className="text-[var(--text-secondary)] font-medium">Side Effect:</span>
              <span className="col-span-2 text-[var(--text-secondary)]">
                Updates property metrics in AI change intelligence, recomputes indicator delta, and surfaces divergence warnings.
              </span>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-1.5">
            <label htmlFor="property-event-reason" className="text-xs font-semibold text-[var(--text-primary)] block">
              Audit Justification / Reason:
            </label>
            <input
              id="property-event-reason"
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Scripted demo event for AI intelligence verification"
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
              {isSubmitting ? 'Applying...' : 'Apply Scripted Event'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
