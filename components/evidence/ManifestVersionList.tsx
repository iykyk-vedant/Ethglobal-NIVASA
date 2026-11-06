import React from 'react';
import { Badge } from '@/components/ui/Badge';

export interface ManifestVersionSummary {
  id: string;
  version: number;
  status: string;
  merkle_root: string;
  manifest_hash: string;
  checklist_completeness: number;
  created_at: string;
  approved_at?: string | null;
}

interface Props {
  manifests: ManifestVersionSummary[];
  selectedVersion?: number;
  onSelectVersion?: (version: number) => void;
}

export function ManifestVersionList({
  manifests,
  selectedVersion,
  onSelectVersion,
}: Props) {
  if (manifests.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--text-secondary)] text-center">
        No manifest versions submitted yet. Upload checklist evidence and submit to generate v1.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Manifest Version History
      </h4>
      <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden">
        {manifests.map((m) => {
          const isSelected = selectedVersion === m.version;
          return (
            <div
              key={m.id}
              onClick={() => onSelectVersion?.(m.version)}
              className={`p-3.5 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-[var(--surface-muted)] border-l-4 border-l-[var(--brand-primary)]'
                  : 'hover:bg-[var(--surface-page)]'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">
                    Version {m.version}
                  </span>
                  <Badge
                    variant={
                      m.status === 'approved'
                        ? 'success'
                        : m.status === 'submitted'
                        ? 'info'
                        : 'neutral'
                    }
                  >
                    {m.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  Created: {new Date(m.created_at).toLocaleDateString()} · Completeness:{' '}
                  {m.checklist_completeness}%
                </div>
              </div>

              <div className="text-right">
                <div className="font-mono text-[11px] text-[var(--text-secondary)]">
                  Root: {m.merkle_root.slice(0, 10)}...{m.merkle_root.slice(-6)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
