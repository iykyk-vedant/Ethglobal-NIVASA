import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface LimitationNoteProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function LimitationNote({
  title = 'Prototype Limitation & Scope Notice',
  children,
  className = '',
}: LimitationNoteProps) {
  return (
    <div
      role="note"
      className={`p-3.5 bg-status-warning/10 border border-status-warning/25 rounded-md text-xs text-text-primary flex items-start gap-2.5 ${className}`}
    >
      <AlertCircle className="w-4 h-4 text-status-warning shrink-0 mt-0.5" aria-hidden="true" />
      <div className="space-y-1">
        <h5 className="font-semibold text-status-warning uppercase tracking-wide text-[11px]">
          {title}
        </h5>
        <div className="text-text-secondary leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
