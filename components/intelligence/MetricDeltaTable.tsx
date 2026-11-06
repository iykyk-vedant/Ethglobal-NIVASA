import React from 'react';
import { DeterministicDeltaResult, IndicatorDelta, MetricDirection } from '@/lib/ai/delta';
import { Badge } from '@/components/ui/Badge';

interface MetricDeltaTableProps {
  metrics: DeterministicDeltaResult;
  snapshotFromLabel?: string;
  snapshotToLabel?: string;
}

function getDirectionBadge(direction: MetricDirection) {
  switch (direction) {
    case 'improved':
      return <Badge variant="success">Improved</Badge>;
    case 'weakened':
      return <Badge variant="warning">Weakened</Badge>;
    case 'unchanged':
      return <Badge variant="neutral">Unchanged</Badge>;
    case 'unsupported':
    default:
      return <Badge variant="neutral">Unsupported</Badge>;
  }
}

export function MetricDeltaTable({
  metrics,
  snapshotFromLabel = 'Snapshot 1 (Baseline)',
  snapshotToLabel = 'Snapshot 2 (Update)',
}: MetricDeltaTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-card shadow-card">
      <div className="p-4 border-b border-border bg-surface-muted flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Deterministic Metric Delta Table
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Pre-computed exact decimal figures. No floating-point rounding or client-side recalculation.
          </p>
        </div>
        <div className="text-xs text-text-secondary font-mono">
          Comparing: {snapshotFromLabel} vs {snapshotToLabel}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" aria-label="Deterministic property metric deltas">
          <thead>
            <tr className="border-b border-border bg-surface-card text-xs text-text-secondary font-medium">
              <th scope="col" className="py-3 px-4">Indicator</th>
              <th scope="col" className="py-3 px-4 text-right">From</th>
              <th scope="col" className="py-3 px-4 text-right">To</th>
              <th scope="col" className="py-3 px-4 text-right">Absolute Change</th>
              <th scope="col" className="py-3 px-4 text-right">Relative Change</th>
              <th scope="col" className="py-3 px-4 text-center">Direction</th>
              <th scope="col" className="py-3 px-4">Evidence Citations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {metrics.deltas.map((d: IndicatorDelta) => (
              <tr key={d.indicator} className="hover:bg-surface-muted/50 transition-colors">
                <td className="py-3 px-4 font-medium text-text-primary">
                  <div>{d.label}</div>
                  {d.policy_flag && (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal block mt-0.5">
                      ⚠️ {d.policy_flag}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-text-secondary">
                  {d.from}
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium text-text-primary">
                  {d.to}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-text-secondary">
                  {d.absolute_change}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-text-secondary">
                  {d.percentage_change !== '0.00' && d.percentage_change !== 'N/A'
                    ? `${d.percentage_change}%`
                    : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  {getDirectionBadge(d.direction)}
                </td>
                <td className="py-3 px-4 text-xs font-mono text-text-secondary">
                  {d.supporting_evidence_ids.length > 0 && d.supporting_evidence_ids[0] !== 'unsupported' ? (
                    <div className="flex flex-wrap gap-1">
                      {d.supporting_evidence_ids.map((id) => (
                        <span key={id} className="px-1.5 py-0.5 rounded bg-surface-muted border border-border">
                          {id}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-text-secondary italic">unsupported</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-surface-muted border-t border-border text-xs text-text-secondary space-y-1">
        <div>
          <strong>* Percentage points (pp) vs Percentage change (%):</strong> For rates and percentages (occupancy, yields), the absolute change denotes percentage-point difference (e.g. 90% to 85% is -5.00 pp), whereas relative change denotes percentage delta over baseline (e.g. -5.56%).
        </div>
        <div>
          <strong>* Operating Expenses:</strong> An increase in operating expenses represents higher outgoing liabilities and is classified as <strong>Weakened</strong>.
        </div>
      </div>
    </div>
  );
}
