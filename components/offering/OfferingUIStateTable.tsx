import React from 'react';
import { OfferingStatus } from '@/lib/state/transitions';
import { OfferingStateBadge } from './OfferingStateBadge';

export interface OfferingUIStateTableProps {
  currentStatus: OfferingStatus | string;
  className?: string;
}

interface StateRow {
  state: OfferingStatus;
  uiTreatment: string;
  orderBehavior: string;
}

const ROWS: StateRow[] = [
  {
    state: 'token_configured',
    uiTreatment: 'Neutral state; indicates activation-gate checks remain incomplete',
    orderBehavior: 'Order creation locked pending verifier activation',
  },
  {
    state: 'active',
    uiTreatment: 'Demo offering active; simulated label; tier accreditation enforced',
    orderBehavior: 'Orders accepted for KYC-accredited bound wallets',
  },
  {
    state: 'paused',
    uiTreatment: 'Warning; administrative manual pause on Hedera ATS proxy',
    orderBehavior: 'All new orders refused; transfers may be paused',
  },
  {
    state: 'paused_evidence_drift',
    uiTreatment: 'Critical warning / fail-closed; evidence changed post-approval',
    orderBehavior: 'Refuses orders (OFFERING_PAUSED_EVIDENCE); ATS paused',
  },
  {
    state: 'closed',
    uiTreatment: 'Neutral closed lifecycle state; offering completed',
    orderBehavior: 'All order and reservation actions permanently disabled',
  },
];

export function OfferingUIStateTable({
  currentStatus,
  className = '',
}: OfferingUIStateTableProps) {
  return (
    <div className={`overflow-hidden border border-[var(--border-subtle)] rounded-lg bg-[var(--surface-primary)] ${className}`}>
      <div className="px-4 py-3 bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Canonical Offering State Map (UI §8.2)
        </h3>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
          Deterministic behavior mapping between PostgreSQL state machine and UI order controls.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-secondary)] font-medium">
              <th scope="col" className="py-2.5 px-3">Canonical State</th>
              <th scope="col" className="py-2.5 px-3">UI Presentation Treatment</th>
              <th scope="col" className="py-2.5 px-3">Order Flow Rule</th>
              <th scope="col" className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
            {ROWS.map((row) => {
              const isCurrent = row.state === currentStatus;
              return (
                <tr
                  key={row.state}
                  className={`transition-colors ${
                    isCurrent
                      ? 'bg-[var(--surface-elevated)] font-medium'
                      : 'hover:bg-[var(--surface-sunken)]/50'
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono text-[11px]">
                    {row.state}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--text-secondary)]">
                    {row.uiTreatment}
                  </td>
                  <td className="py-2.5 px-3">
                    {row.orderBehavior}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-[var(--status-success)] text-[11px] font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--status-success)]" />
                        Current
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)] text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
