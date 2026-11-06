'use client';

import React from 'react';
import { ArrowLeftRight, Check, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export interface RightsVersionData {
  version: number;
  rights_document_hash: string;
  represents?: string | null;
  does_not_represent?: string | null;
  income_entitlement_rule?: string | null;
  transfer_rule?: string | null;
  redemption_rule?: string | null;
  voting_or_control_rights?: string | null;
  risk_disclosures?: string | null;
}

export interface RightsDiffViewerProps {
  currentVersion: RightsVersionData;
  previousVersion?: RightsVersionData | null;
}

export const RightsDiffViewer: React.FC<RightsDiffViewerProps> = ({
  currentVersion,
  previousVersion,
}) => {
  if (!previousVersion) {
    return (
      <div
        className="p-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs text-[var(--text-secondary)]"
        data-testid="rights-diff-viewer"
      >
        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
          <ArrowLeftRight className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
          <span>Version Comparison (v{currentVersion.version})</span>
        </div>
        <p className="mt-1">
          This is initial baseline rights specification v{currentVersion.version}. No previous version exists for comparison.
        </p>
      </div>
    );
  }

  const fields: Array<{ label: string; key: keyof RightsVersionData }> = [
    { label: 'Document Hash', key: 'rights_document_hash' },
    { label: 'What Token Represents', key: 'represents' },
    { label: 'What Token Does NOT Represent', key: 'does_not_represent' },
    { label: 'Income Entitlement Rule', key: 'income_entitlement_rule' },
    { label: 'Transferability Rule', key: 'transfer_rule' },
    { label: 'Redemption / Exit Rule', key: 'redemption_rule' },
    { label: 'Voting & Control Entitlement', key: 'voting_or_control_rights' },
  ];

  return (
    <div
      className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4"
      data-testid="rights-diff-viewer"
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Rights Specification Diff: v{previousVersion.version} → v{currentVersion.version}
          </h3>
        </div>
        <Badge variant="warning" className="text-xs">
          Re-Approval Required
        </Badge>
      </div>

      <div className="space-y-3">
        {fields.map(({ label, key }) => {
          const prevVal = String(previousVersion[key] || 'Not specified');
          const currVal = String(currentVersion[key] || 'Not specified');
          const isChanged = prevVal !== currVal;

          return (
            <div
              key={key}
              className="p-3 rounded border border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">{label}</span>
                {isChanged ? (
                  <Badge variant="warning" className="text-[10px]">
                    MODIFIED
                  </Badge>
                ) : (
                  <Badge variant="neutral" className="text-[10px]">
                    UNCHANGED
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-2 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-secondary)] block uppercase font-mono">
                    v{previousVersion.version} (Previous):
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 break-words">
                    {prevVal}
                  </p>
                </div>

                <div className={`p-2 rounded border ${isChanged ? 'bg-[var(--surface-primary)] border-[var(--brand-forest)]' : 'bg-[var(--surface-primary)] border-[var(--border-subtle)]'}`}>
                  <span className="text-[10px] text-[var(--brand-forest)] block uppercase font-mono font-semibold">
                    v{currentVersion.version} (Current):
                  </span>
                  <p className="text-[11px] text-[var(--text-primary)] mt-0.5 break-words font-medium">
                    {currVal}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-[var(--text-secondary)] italic pt-1">
        *Orders placed prior to v{currentVersion.version} remain cryptographically pinned to v{previousVersion.version} hash ({previousVersion.rights_document_hash.slice(0, 10)}...).
      </p>
    </div>
  );
};

