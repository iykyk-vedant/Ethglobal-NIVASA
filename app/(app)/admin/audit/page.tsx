'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  ShieldAlert,
  History,
  Copy,
  Check,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  Info,
  ChevronDown,
  ChevronRight,
  Hash,
} from 'lucide-react';

interface AuditLogEntry {
  id: number;
  actorUserId: string | null;
  actorName: string;
  actorRole: string;
  actorWallet: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeHash: string | null;
  afterHash: string | null;
  reason: string | null;
  prevHash: string;
  rowHash: string;
  createdAt: string;
}

interface ChainVerification {
  isVerified: boolean;
  unbroken: boolean;
  totalRows: number;
  verifiedRows: number;
  genesisHash: string;
  tipHash: string;
  brokenAtIndex: number | null;
  brokenReason: string | null;
  verifiedAt: string;
}

export default function AdminAuditLogChainPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [verification, setVerification] = useState<ChainVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [expandedRowId, setExpandedRowId] = useState<number | null>(null);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(json.logs || []);
        setVerification(json.chainVerification || null);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const actionTypes = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((l) => set.add(l.action));
    return ['ALL', ...Array.from(set)];
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== 'ALL' && log.action !== actionFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = log.action.toLowerCase().includes(q);
        const matchesResource = log.resourceType.toLowerCase().includes(q) || log.resourceId.toLowerCase().includes(q);
        const matchesActor = log.actorName.toLowerCase().includes(q) || log.actorRole.toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q);
        const matchesHash = log.rowHash.toLowerCase().includes(q) || log.prevHash.toLowerCase().includes(q);
        return matchesAction || matchesResource || matchesActor || matchesReason || matchesHash;
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  return (
    <AppShell initialRole="admin">
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Tamper-Evident Audit Log Hash Chain"
            description="Cryptographically linked, append-only PostgreSQL ledger tracking all privileged actions, role changes, and state transitions (ARCH §17.2, §17.5, §19)."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Audit Log Chain' },
            ]}
          />

          {/* Cryptographic Chain Integrity Banner */}
          {verification && (
            <section
              className={`p-4 rounded-xl border shadow-sm transition-all ${
                verification.isVerified
                  ? 'bg-[var(--surface-primary)] border-[var(--status-success)]/40'
                  : 'bg-[var(--surface-primary)] border-[var(--status-danger)]/50'
              }`}
              data-testid="audit-chain-verification-panel"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2.5 rounded-lg ${
                      verification.isVerified
                        ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                        : 'bg-[var(--status-danger)]/10 text-[var(--status-danger)]'
                    }`}
                  >
                    {verification.isVerified ? (
                      <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                    ) : (
                      <ShieldAlert className="w-6 h-6" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                        {verification.isVerified
                          ? 'Audit Hash-Chain Integrity: VERIFIED & UNBROKEN'
                          : 'Hash Chain Integrity Failure: TAMPER DETECTED'}
                      </h2>
                      <Badge
                        variant={verification.isVerified ? 'success' : 'danger'}
                        className="text-[10px] font-mono"
                      >
                        {verification.isVerified ? 'SHA-256 PASS' : 'HASH MISMATCH'}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {verification.totalRows} consecutive rows verified end-to-end (prev_hash Strictly matches preceding row_hash).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={fetchAuditLogs}
                    disabled={loading}
                    className="text-xs"
                    data-testid="refresh-audit-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    <span>Re-verify Chain</span>
                  </Button>
                </div>
              </div>

              {/* Tip & Genesis Hashes */}
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-[11px] text-[var(--text-secondary)] font-sans font-medium">Genesis Chain Hash:</span>
                  <div className="p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="truncate">{verification.genesisHash}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(verification.genesisHash)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] ml-2"
                      title="Copy hash"
                    >
                      {copiedHash === verification.genesisHash ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[var(--text-secondary)] font-sans font-medium">Current Tip Hash:</span>
                  <div className="p-2 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="truncate">{verification.tipHash}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(verification.tipHash)}
                      className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] ml-2"
                      title="Copy hash"
                    >
                      {copiedHash === verification.tipHash ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Search & Filter Toolbar */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by action, actor, resource ID, or hash..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-secondary)] font-medium">Action:</span>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="p-2 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] font-mono focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                >
                  {actionTypes.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
              <span>Showing {filteredLogs.length} of {logs.length} audit entries</span>
              <span>Append-only PostgreSQL RPC audit_append()</span>
            </div>
          </section>

          {/* Audit Log Table */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" data-testid="audit-log-table">
                <thead className="bg-[var(--surface-sunken)] border-b border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
                  <tr>
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Reason / Notes</th>
                    <th className="py-3 px-4">Row Hash</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-secondary)] italic">
                        Verifying and loading audit chain...
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[var(--text-secondary)] italic">
                        No audit log entries found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((entry) => {
                      const isExpanded = expandedRowId === entry.id;

                      return (
                        <React.Fragment key={entry.id}>
                          <tr className="hover:bg-[var(--surface-sunken)]/60 transition-colors">
                            <td className="py-3 px-4 font-mono font-semibold text-[var(--text-secondary)]">
                              {entry.id}
                            </td>
                            <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                              <Badge variant="neutral" className="text-[10px] font-mono">
                                {entry.action}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <span className="font-semibold text-[var(--text-primary)] block">
                                  {entry.actorName}
                                </span>
                                <Badge variant="neutral" className="text-[9px] uppercase tracking-wider">
                                  {entry.actorRole}
                                </Badge>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 font-mono text-[11px]">
                                <span className="text-[var(--text-secondary)]">{entry.resourceType}:</span>
                                <span className="text-[var(--text-primary)] block truncate max-w-[140px]" title={entry.resourceId}>
                                  {entry.resourceId.slice(0, 10)}...
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[var(--text-primary)] max-w-xs truncate" title={entry.reason || ''}>
                              {entry.reason || '—'}
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[var(--text-secondary)] truncate max-w-[90px]" title={entry.rowHash}>
                                  {entry.rowHash.slice(0, 10)}...
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(entry.rowHash)}
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                  title="Copy Row Hash"
                                >
                                  {copiedHash === entry.rowHash ? (
                                    <Check className="w-3 h-3 text-[var(--status-success)]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-[var(--text-secondary)] text-[11px] whitespace-nowrap">
                              {new Date(entry.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setExpandedRowId(isExpanded ? null : entry.id)}
                                className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline font-semibold"
                                aria-expanded={isExpanded}
                              >
                                <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Technical Inspection Row */}
                          {isExpanded && (
                            <tr className="bg-[var(--surface-sunken)]">
                              <td colSpan={8} className="p-4 space-y-3 border-y border-[var(--border-subtle)]">
                                <div className="space-y-1">
                                  <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
                                    <span>Cryptographic Hash Details for Entry #{entry.id}</span>
                                  </h4>
                                  <p className="text-[11px] text-[var(--text-secondary)]">
                                    Canonical payload: prev_hash || actor_user_id || actor_wallet || action || resource_type || resource_id || before_hash || after_hash || timestamp
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                                  <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] space-y-1">
                                    <span className="text-[var(--text-secondary)] text-[10px] font-sans block">Previous Hash (prev_hash):</span>
                                    <div className="flex items-center justify-between">
                                      <span className="break-all">{entry.prevHash}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(entry.prevHash)}
                                        className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)] space-y-1">
                                    <span className="text-[var(--text-secondary)] text-[10px] font-sans block">Row Hash (row_hash):</span>
                                    <div className="flex items-center justify-between">
                                      <span className="break-all font-semibold text-[var(--text-primary)]">{entry.rowHash}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleCopy(entry.rowHash)}
                                        className="ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                                  <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                                    <span className="text-[var(--text-secondary)] block text-[10px]">Actor User ID / Wallet:</span>
                                    <span className="font-mono text-[var(--text-primary)] break-all">
                                      {entry.actorUserId || entry.actorWallet || 'system_worker'}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                                    <span className="text-[var(--text-secondary)] block text-[10px]">Before State / Hash:</span>
                                    <span className="font-mono text-[var(--text-primary)] break-all">
                                      {entry.beforeHash || 'null'}
                                    </span>
                                  </div>

                                  <div className="p-2.5 rounded bg-[var(--surface-primary)] border border-[var(--border-subtle)]">
                                    <span className="text-[var(--text-secondary)] block text-[10px]">After State / Hash:</span>
                                    <span className="font-mono text-[var(--text-primary)] break-all">
                                      {entry.afterHash || 'null'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </PageContainer>
    </AppShell>
  );
}
