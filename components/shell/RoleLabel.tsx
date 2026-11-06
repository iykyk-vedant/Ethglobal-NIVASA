import React from 'react';
import { UserRole } from '@/lib/auth/roles';
import { Shield, FileCheck, Landmark, Briefcase, Eye } from 'lucide-react';

export interface RoleLabelProps {
  role?: UserRole | 'public';
  className?: string;
}

export function RoleLabel({ role = 'public', className = '' }: RoleLabelProps) {
  const config = {
    issuer: {
      label: 'Issuer Console',
      icon: Landmark,
      style: 'bg-brand-primary text-surface-card border-brand-primary',
    },
    verifier: {
      label: 'Independent Verifier',
      icon: FileCheck,
      style: 'bg-brand-secondary text-surface-card border-brand-secondary',
    },
    investor: {
      label: 'Accredited Investor',
      icon: Briefcase,
      style: 'bg-brand-accent/20 text-brand-primary border-brand-accent/40',
    },
    admin: {
      label: 'System Admin',
      icon: Shield,
      style: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    },
    public: {
      label: 'Public Explorer',
      icon: Eye,
      style: 'bg-surface-muted text-text-secondary border-border',
    },
  }[role];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium border ${config.style} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{config.label}</span>
    </span>
  );
}
