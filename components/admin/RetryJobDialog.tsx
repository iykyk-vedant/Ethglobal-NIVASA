'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RefreshCw, AlertTriangle, X } from 'lucide-react';

interface RetryJobDialogProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    type: string;
    dedupeKey: string;
    status: string;
    attempts: number;
    correlationId: string;
    lastError?: string | null;
  } | null;
  onSuccess: (auditRef: number) => void;
}

export function RetryJobDialog({
  isOpen,
  onClose,
  job,
  onSuccess,
}: RetryJobDialogProps) {
  const [reason, setReason] = useState('Operator manually rescheduling dead job for safe idempotent worker pickup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !job) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError('A justification of at least 5 characters is required for the audit trail.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/jobs/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': 'f3509049-11fb-4ab4-993b-050c7878d1d3',
        },
        body: JSON.stringify({
          jobId: job.id,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to retry job');
      }

      onSuccess(data.auditLogId);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="retry-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface-card shadow-2xl p-6 text-foreground space-y-5 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 id="retry-dialog-title" className="text-base font-semibold">
              Request Safe Job Retry
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Confirmation Details Card */}
        <div className="rounded-lg border border-border bg-surface-elevated p-4 text-xs space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Job Type:</span>
            <span className="col-span-2 font-mono font-semibold text-foreground">
              {job.type}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Job ID:</span>
            <span className="col-span-2 font-mono text-muted-foreground break-all">
              {job.id}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Correlation ID:</span>
            <span className="col-span-2 font-mono text-[var(--brand-primary)] break-all font-semibold">
              {job.correlationId}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Previous State:</span>
            <div className="col-span-2 flex items-center gap-2">
              <Badge variant={job.status === 'dead' ? 'danger' : 'warning'}>
                {job.status}
              </Badge>
              <span className="text-muted-foreground">({job.attempts} attempts exhausted)</span>
            </div>
          </div>
          {job.lastError && (
            <div className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground font-medium">Last Error:</span>
              <span className="col-span-2 font-mono text-red-300 break-all text-[11px]">
                {job.lastError}
              </span>
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Side Effect:</span>
            <span className="col-span-2 text-foreground">
              Resets status to <code>pending</code> and attempts to <code>0</code>. The existing background worker will safely execute the idempotent handler on its next tick. No inline chain calls are executed.
            </span>
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="retry-reason-input" className="block text-xs font-medium text-foreground mb-1">
              Audit Justification / Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              id="retry-reason-input"
              rows={2}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Rescheduling...' : 'Confirm Retry Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
