'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Shield, ShieldAlert, CheckCircle2, AlertTriangle, X } from 'lucide-react';

interface RoleManagementDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    displayName: string;
    email: string;
    roles: string[];
  } | null;
  onSuccess: (auditRef: number) => void;
}

export function RoleManagementDialog({
  isOpen,
  onClose,
  user,
  onSuccess,
}: RoleManagementDialogProps) {
  const [selectedRole, setSelectedRole] = useState<'issuer' | 'verifier' | 'investor' | 'admin'>('verifier');
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 5) {
      setError('A substantive justification of at least 5 characters is required for the audit log.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': 'f3509049-11fb-4ab4-993b-050c7878d1d3',
        },
        body: JSON.stringify({
          userId: user.id,
          role: selectedRole,
          action,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update role');
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
      aria-labelledby="role-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-xl border border-border bg-surface-card shadow-2xl p-6 text-foreground space-y-5 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2 id="role-dialog-title" className="text-base font-semibold">
              Manage Authorized User Role
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
            <span className="text-muted-foreground font-medium">Target User:</span>
            <span className="col-span-2 font-mono text-foreground font-medium">
              {user.displayName} ({user.email})
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">User ID:</span>
            <span className="col-span-2 font-mono text-xs text-muted-foreground break-all">
              {user.id}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Current Roles:</span>
            <div className="col-span-2 flex flex-wrap gap-1">
              {user.roles.length > 0 ? (
                user.roles.map((r) => (
                  <Badge key={r} variant="neutral">
                    {r}
                  </Badge>
                ))
              ) : (
                <span className="text-muted-foreground italic">None</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <span className="text-muted-foreground font-medium">Side Effect:</span>
            <span className="col-span-2 text-foreground">
              Modifies permissions immediately. Action is permanently cryptographically chained in audit_logs.
            </span>
          </div>
        </div>

        {/* SoD Invariant Notice */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Separation of Duties (SoD) Invariant:</strong> Even if granted multiple roles, database triggers strictly prevent any user from approving their own property, offering, or investor eligibility.
          </span>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="action-select" className="block text-xs font-medium text-foreground mb-1">
                Action
              </label>
              <select
                id="action-select"
                value={action}
                onChange={(e) => setAction(e.target.value as 'grant' | 'revoke')}
                className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              >
                <option value="grant">Grant Role</option>
                <option value="revoke">Revoke Role</option>
              </select>
            </div>

            <div>
              <label htmlFor="role-select" className="block text-xs font-medium text-foreground mb-1">
                Role
              </label>
              <select
                id="role-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full rounded-md border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]"
              >
                <option value="verifier">Verifier (Reviews evidence / eligibility)</option>
                <option value="issuer">Issuer (Proposes properties / documents)</option>
                <option value="investor">Investor (Places orders & signs acks)</option>
                <option value="admin">Admin (Ops / Demo controls)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="reason-input" className="block text-xs font-medium text-foreground mb-1">
              Audit Justification / Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              id="reason-input"
              rows={2}
              required
              placeholder="e.g. Authorized Title Verification Auditor assignment for Mumbai commercial portfolio"
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
            <Button
              type="submit"
              variant={action === 'grant' ? 'primary' : 'destructive'}
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Recording...' : `Confirm ${action === 'grant' ? 'Grant' : 'Revoke'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
