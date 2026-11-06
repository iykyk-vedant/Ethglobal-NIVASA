import React from 'react';
import Link from 'next/link';
import { FileText, ExternalLink } from 'lucide-react';

interface EvidenceCitationListProps {
  propertyId: string;
  sourceIds: string[];
}

export function EvidenceCitationList({ propertyId, sourceIds }: EvidenceCitationListProps) {
  if (!sourceIds || sourceIds.length === 0) {
    return (
      <div className="p-4 rounded-xl border border-border bg-surface-card text-xs text-text-secondary">
        No supporting evidence records cited for this analysis.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden shadow-card p-5 space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h4 className="text-sm font-semibold text-text-primary">
            Supporting Evidence Citations
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">
            Every analytical claim in the 0G summary references verified or simulated records.
          </p>
        </div>
        <Link
          href={`/properties/${propertyId}/documents`}
          className="text-xs font-medium text-brand-primary hover:underline flex items-center gap-1"
        >
          View All Documents <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {sourceIds.map((id) => (
          <div
            key={id}
            className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface-muted/50 text-xs"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-text-secondary shrink-0" />
              <span className="font-mono font-medium text-text-primary truncate">{id}</span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded bg-surface-card border border-border text-text-secondary shrink-0">
              CITED
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
