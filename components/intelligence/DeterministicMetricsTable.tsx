import React from 'react';
import { DeterministicMetrics, MetricDelta } from '@/lib/ai/metrics';
import { Badge } from '@/components/ui/Badge';

interface Props {
  metrics: DeterministicMetrics;
  snapshotFromLabel?: string;
  snapshotToLabel?: string;
}

function getDirectionBadge(delta: MetricDelta) {
  switch (delta.direction) {
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

export function DeterministicMetricsTable({
  metrics,
  snapshotFromLabel = 'Snapshot 1 (Baseline)',
  snapshotToLabel = 'Snapshot 2 (Update)',
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-card)]">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Deterministic Metric Comparison
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Pre-computed exact decimal figures. No floating-point or client-side financial estimation.
          </p>
        </div>
        <div className="text-xs text-[var(--text-secondary)] font-mono">
          Comparing: {snapshotFromLabel} vs {snapshotToLabel}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-card)] text-xs text-[var(--text-secondary)] font-medium">
              <th className="py-3 px-4">Indicator</th>
              <th className="py-3 px-4 text-right">From ({snapshotFromLabel})</th>
              <th className="py-3 px-4 text-right">To ({snapshotToLabel})</th>
              <th className="py-3 px-4 text-right">Absolute Change</th>
              <th className="py-3 px-4 text-right">Pct Change</th>
              <th className="py-3 px-4 text-center">Direction</th>
              <th className="py-3 px-4">Evidence Citations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {metrics.deltas.map((d) => (
              <tr key={d.indicator} className="hover:bg-[var(--surface-muted)] transition-colors">
                <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                  <div>{d.label}</div>
                  {d.policy_flag && (
                    <span className="text-[11px] text-[var(--status-warning)] font-normal block mt-0.5">
                      ⚠️ {d.policy_flag}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right font-mono text-[var(--text-secondary)]">
                  {d.indicator.includes('inr') ? `₹${d.from}` : d.indicator.includes('pct') ? `${d.from}%` : d.from}
                </td>
                <td className="py-3 px-4 text-right font-mono font-medium text-[var(--text-primary)]">
                  {d.indicator.includes('inr') ? `₹${d.to}` : d.indicator.includes('pct') ? `${d.to}%` : d.to}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--text-secondary)]">
                  {d.indicator.includes('inr') ? `₹${d.absolute_change}` : d.indicator.includes('pct') ? `${d.absolute_change}%` : d.absolute_change}
                </td>
                <td className="py-3 px-4 text-right font-mono text-xs text-[var(--text-secondary)]">
                  {d.percentage_change !== '0.00' ? `${d.percentage_change}%` : '—'}
                </td>
                <td className="py-3 px-4 text-center">
                  {getDirectionBadge(d)}
                </td>
                <td className="py-3 px-4 text-xs font-mono text-[var(--text-secondary)]">
                  {d.supporting_evidence_ids.length > 0
                    ? d.supporting_evidence_ids.join(', ')
                    : 'unsupported'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[var(--surface-muted)] border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
        * Note: Gross yield is rent ÷ valuation. Operating costs increase is classified as a weakened indicator.
      </div>
    </div>
  );
}

