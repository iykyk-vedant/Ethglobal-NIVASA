import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  statusBadge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  statusBadge,
  className = '',
}: PageHeaderProps) {
  return (
    <header className={`space-y-3 pb-6 border-b border-border mb-6 md:mb-8 ${className}`}>
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              {title}
            </h1>
            {statusBadge}
          </div>
          {description && (
            <p className="text-sm text-text-secondary max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
