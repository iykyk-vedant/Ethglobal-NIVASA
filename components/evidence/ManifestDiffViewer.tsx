import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { ManifestDocumentEntry } from '@/lib/evidence/manifest';

interface ManifestData {
  version: number;
  merkle_root: string;
  manifest_hash: string;
  documents: ManifestDocumentEntry[];
}

interface Props {
  currentManifest: ManifestData;
  previousManifest?: ManifestData | null;
}

export function ManifestDiffViewer({ currentManifest, previousManifest }: Props) {
  if (!previousManifest) {
    return (
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-xs space-y-2">
        <div className="font-semibold text-[var(--text-primary)]">
          Initial Manifest Version (v{currentManifest.version})
        </div>
        <p className="text-[var(--text-secondary)]">
          This is the baseline evidence manifest submission. No prior manifest version exists to compare against.
        </p>
      </div>
    );
  }

  // Compare documents
  const prevMap = new Map<string, ManifestDocumentEntry>();
  previousManifest.documents.forEach((d) => prevMap.set(d.document_type, d));

  const currentMap = new Map<string, ManifestDocumentEntry>();
  currentManifest.documents.forEach((d) => currentMap.set(d.document_type, d));

  const allTypes = Array.from(new Set([...prevMap.keys(), ...currentMap.keys()]));

  const added: ManifestDocumentEntry[] = [];
  const removed: ManifestDocumentEntry[] = [];
  const modified: Array<{ type: string; from: ManifestDocumentEntry; to: ManifestDocumentEntry }> = [];
  const unchanged: ManifestDocumentEntry[] = [];

  for (const type of allTypes) {
    const prev = prevMap.get(type);
    const curr = currentMap.get(type);

    if (!prev && curr) {
      added.push(curr);
    } else if (prev && !curr) {
      removed.push(prev);
    } else if (prev && curr) {
      if (prev.sha256_hash !== curr.sha256_hash) {
        modified.push({ type, from: prev, to: curr });
      } else {
        unchanged.push(curr);
      }
    }
  }

  const rootChanged = currentManifest.merkle_root !== previousManifest.merkle_root;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm space-y-4 p-5">
      <div className="border-b border-[var(--border)] pb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Manifest Diff: v{previousManifest.version} &rarr; v{currentManifest.version}
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Cryptographic comparison of evidence roots and individual document leaves.
          </p>
        </div>
        <div>
          {rootChanged ? (
            <Badge variant="warning">Merkle Root Changed</Badge>
          ) : (
            <Badge variant="neutral">Root Unchanged</Badge>
          )}
        </div>
      </div>

      {/* Root Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] space-y-1">
          <div className="text-[var(--text-secondary)] font-sans font-medium">Previous Root (v{previousManifest.version}):</div>
          <div className="text-[var(--text-secondary)] break-all">{previousManifest.merkle_root}</div>
        </div>
        <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] space-y-1">
          <div className="text-[var(--text-secondary)] font-sans font-medium">Current Root (v{currentManifest.version}):</div>
          <div className="text-[var(--brand-primary)] font-bold break-all">{currentManifest.merkle_root}</div>
        </div>
      </div>

      {/* Changes Breakdown */}
      <div className="space-y-3 text-xs">
        {modified.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-semibold text-amber-700 dark:text-amber-400">
              Modified Documents ({modified.length}):
            </div>
            {modified.map((m) => (
              <div key={m.type} className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-1">
                <div className="font-medium text-[var(--text-primary)]">{m.type}</div>
                <div className="font-mono text-[11px] text-[var(--text-secondary)] space-y-0.5">
                  <div>Previous: {m.from.sha256_hash.slice(0, 16)}... (Ref: {m.from.source_reference || '—'})</div>
                  <div className="text-amber-700 dark:text-amber-300 font-semibold">
                    Updated:  {m.to.sha256_hash.slice(0, 16)}... (Ref: {m.to.source_reference || '—'})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {added.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-semibold text-emerald-700 dark:text-emerald-400">
              Added Documents ({added.length}):
            </div>
            {added.map((a) => (
              <div key={a.document_type} className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-[var(--text-primary)] font-medium">
                + {a.document_type} ({a.sha256_hash.slice(0, 16)}...)
              </div>
            ))}
          </div>
        )}

        {removed.length > 0 && (
          <div className="space-y-1.5">
            <div className="font-semibold text-rose-700 dark:text-rose-400">
              Removed Documents ({removed.length}):
            </div>
            {removed.map((r) => (
              <div key={r.document_type} className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 font-medium">
                - {r.document_type} ({r.sha256_hash.slice(0, 16)}...)
              </div>
            ))}
          </div>
        )}

        {modified.length === 0 && added.length === 0 && removed.length === 0 && (
          <div className="text-xs text-[var(--text-secondary)] italic">
            No document leaf changes between version {previousManifest.version} and version {currentManifest.version}.
          </div>
        )}
      </div>
    </div>
  );
}
