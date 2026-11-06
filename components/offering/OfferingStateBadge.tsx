'use client';

import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { OfferingStatus } from '@/lib/state/transitions';

export interface OfferingStateBadgeProps {
  status: OfferingStatus | string;
  showTechnicalName?: boolean;
  className?: string;
}

interface StateConfig {
  label: string;
  variant: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  description: string;
}

const STATE_MAP: Record<string, StateConfig> = {
  draft: {
    label: 'Draft',
    variant: 'neutral',
    description: 'Offering configuration is in draft and pending proposal.',
  },
  proposed: {
    label: 'Proposed',
    variant: 'info',
    description: 'Proposed by issuer; awaiting independent legal and title review.',
  },
  legal_review_pending: {
    label: 'Legal Review Pending',
    variant: 'warning',
    description: 'Under review by licensed verifier against evidence manifest.',
  },
  approved_for_demo: {
    label: 'Approved for Demo',
    variant: 'success',
    description: 'Approved by independent verifier; awaiting token configuration.',
  },
  token_configured: {
    label: 'Token Configured',
    variant: 'info',
    description: 'ATS token diamond proxy configured on Hedera Testnet (Chain 296).',
  },
  active: {
    label: 'Demo Offering Active',
    variant: 'success',
    description: 'Offering is active on Hedera Testnet for eligible simulated orders.',
  },
  paused: {
    label: 'Issuance Paused',
    variant: 'warning',
    description: 'Manual administrator pause on Hedera ATS asset contract.',
  },
  paused_evidence_drift: {
    label: 'Paused (Evidence Drift)',
    variant: 'danger',
    description: 'Evidence manifest changed after approval. Issuance locked until re-verified.',
  },
  closed: {
    label: 'Closed',
    variant: 'neutral',
    description: 'Offering lifecycle closed; no further units can be reserved.',
  },
};

export function OfferingStateBadge({
  status,
  showTechnicalName = false,
  className = '',
}: OfferingStateBadgeProps) {
  const config = STATE_MAP[status] || {
    label: status.replace(/_/g, ' '),
    variant: 'neutral',
    description: `Canonical state: ${status}`,
  };

  const badgeContent = (
    <Badge
      variant={config.variant}
      className={`font-medium tracking-wide ${className}`}
      data-testid={`offering-state-badge-${status}`}
    >
      <span className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor:
              config.variant === 'success'
                ? 'var(--status-success)'
                : config.variant === 'warning'
                ? 'var(--status-warning)'
                : config.variant === 'danger'
                ? 'var(--status-danger)'
                : config.variant === 'info'
                ? 'var(--brand-gold)'
                : 'var(--text-secondary)',
          }}
          aria-hidden="true"
        />
        <span>{config.label}</span>
        {showTechnicalName && (
          <span className="opacity-75 font-mono text-xs">({status})</span>
        )}
      </span>
    </Badge>
  );

  return (
    <Tooltip content={`${config.description} [Canonical: ${status}]`}>
      {badgeContent}
    </Tooltip>
  );
}
