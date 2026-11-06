import React from 'react';

interface Props {
  completenessPct: string | number;
  earnedWeight: number;
  totalRequiredWeight: number;
  isComplete: boolean;
}

export function ChecklistProgress({
  completenessPct,
  earnedWeight,
  totalRequiredWeight,
  isComplete,
}: Props) {
  const numericPct = Math.min(100, Math.max(0, Number(completenessPct)));

  return (
    <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Evidence Checklist Completeness
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Weighted checklist completeness — not a title-clearance score
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-base font-bold text-[var(--brand-primary)]">
            {typeof completenessPct === 'number' ? completenessPct.toFixed(2) : completenessPct}%
          </span>
          <span className="text-xs text-[var(--text-secondary)]">
            ({earnedWeight} / {totalRequiredWeight} pts)
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isComplete ? 'bg-[var(--status-success)]' : 'bg-[var(--brand-accent)]'
          }`}
          style={{ width: `${numericPct}%` }}
        />
      </div>

      <div className="text-[11px] text-[var(--text-secondary)] italic">
        * Measured against the Maharashtra RWA Evidence Checklist v1.0. Does not constitute statutory title clearance.
      </div>
    </div>
  );
}

