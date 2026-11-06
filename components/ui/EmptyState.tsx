import React from 'react';
import { HelpCircle, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = HelpCircle,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-surface-card rounded-md border border-border ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-surface-muted flex items-center justify-center text-text-secondary mb-4">
        <Icon className="w-6 h-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};
