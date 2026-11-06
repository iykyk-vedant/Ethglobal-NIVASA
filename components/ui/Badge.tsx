import React from 'react';
import type { LucideIcon } from 'lucide-react';
import type { StatePresentation } from '@/lib/ui/state-map';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'neutral';
  icon?: LucideIcon;
  state?: StatePresentation;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  icon: IconProp,
  state,
  className = '',
}) => {
  // If a state presentation object is passed directly, use its properties
  if (state) {
    const StateIcon = state.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium border ${state.badgeClass} ${className}`}
      >
        <StateIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{state.label}</span>
      </span>
    );
  }

  const variantStyles = {
    success: 'bg-status-success/10 text-status-success border-status-success/30',
    warning: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    danger: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    info: 'bg-status-info/10 text-status-info border-status-info/30',
    pending: 'bg-status-pending/10 text-status-pending border-status-pending/30',
    neutral: 'bg-surface-muted text-text-secondary border-border',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium border ${variantStyles} ${className}`}
    >
      {IconProp && <IconProp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};
