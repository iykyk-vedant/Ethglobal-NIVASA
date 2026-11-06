import React from 'react';
import { ShieldCheck, UserCheck, Globe, Cpu, HelpCircle, type LucideIcon } from 'lucide-react';

export type ProvenanceType =
  | 'independently_verified'
  | 'issuer_reported'
  | 'public_source'
  | 'simulated'
  | 'unknown';

export interface ProvenanceBadgeProps {
  provenance: ProvenanceType;
  className?: string;
}

export function ProvenanceBadge({ provenance, className = '' }: ProvenanceBadgeProps) {
  const config: Record<
    ProvenanceType,
    { label: string; icon: LucideIcon; badgeClass: string; description: string }
  > = {
    independently_verified: {
      label: 'Independently Verified',
      icon: ShieldCheck,
      badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
      description: 'Audit verified by licensed third-party verifier distinct from issuer.',
    },
    issuer_reported: {
      label: 'Issuer-Reported',
      icon: UserCheck,
      badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
      description: 'Metric reported directly by property issuer without external audit.',
    },
    public_source: {
      label: 'Public Source',
      icon: Globe,
      badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
      description: 'Sourced from public municipal or revenue registry benchmark data.',
    },
    simulated: {
      label: 'Simulated Demo Value',
      icon: Cpu,
      badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
      description: 'Demonstration baseline figure generated for prototype test suite.',
    },
    unknown: {
      label: 'Provenance Unknown',
      icon: HelpCircle,
      badgeClass: 'bg-surface-muted text-text-secondary border-border',
      description: 'Origin of this data point cannot be cryptographically verified.',
    },
  };

  const item = config[provenance] || config.unknown;
  const Icon = item.icon;

  return (
    <span
      title={item.description}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium border ${item.badgeClass} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </span>
  );
}
