import React from 'react';
import { HelpCircle } from 'lucide-react';

interface CannotDetermineListProps {
  cannotDetermine: string[];
}

export function CannotDetermineList({ cannotDetermine }: CannotDetermineListProps) {
  if (!cannotDetermine || cannotDetermine.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden shadow-card p-5 space-y-3">
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <HelpCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            Cannot Determine From Provided Data
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Strict ground-truth guardrail: The 0G model explicitly reports what it cannot know to prevent ungrounded speculation.
          </p>
        </div>
      </div>

      <ul className="space-y-2 text-xs text-text-secondary">
        {cannotDetermine.map((item, index) => (
          <li key={index} className="flex items-start gap-2 p-2.5 rounded-lg bg-surface-muted/50 border border-border">
            <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
