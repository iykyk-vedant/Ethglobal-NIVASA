import React from 'react';
import { Badge } from '@/components/ui/Badge';

export function ProvenanceLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-xs text-[var(--text-secondary)]">
      <span className="font-medium text-[var(--text-primary)]">Data Provenance:</span>
      <Badge variant="neutral" className="bg-[var(--surface-card)]">Independently verified</Badge>
      <Badge variant="neutral" className="bg-[var(--surface-card)]">Issuer-reported</Badge>
      <Badge variant="neutral" className="bg-[var(--surface-card)]">Public-source</Badge>
      <Badge variant="warning" className="bg-amber-100/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">Simulated (Demo)</Badge>
      <Badge variant="neutral" className="bg-[var(--surface-card)]">Unknown</Badge>
    </div>
  );
}

