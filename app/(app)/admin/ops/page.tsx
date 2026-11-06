'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { RoleManagementDialog } from '@/components/admin/RoleManagementDialog';
import { RetryJobDialog } from '@/components/admin/RetryJobDialog';
import { formatINR } from '@/lib/money/decimal';
import {
  Activity,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  UserCheck,
  Cpu,
  Copy,
  Check,
  Sliders,
  History,
  Coins,
} from 'lucide-react';

export default function AdminOpsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobFilter, setJobFilter] = useState<'all' | 'dead_failed' | 'pending' | 'completed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dialog states
  const [selectedRetryJob, setSelectedRetryJob] = useState<any>(null);
  const [isRetryDialogOpen, setIsRetryDialogOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  const fetchOpsData = useCallback(async () => {
    setLoading(true);
    try {
      const [opsRes, rolesRes] = await Promise.all([
        fetch('/api/admin/ops', {
          headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
        }),
        fetch('/api/admin/roles', {
          headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
        }),
      ]);

      if (!opsRes.ok) {
        const errJson = await opsRes.json();
        throw new Error(errJson.message || errJson.error || 'Failed to load ops data');
      }

      const opsJson = await opsRes.json();
      setData(opsJson);

      if (rolesRes.ok) {
        const rolesJson = await rolesRes.json();
        setUsersList(rolesJson.users || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpsData();
  }, [fetchOpsData]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredJobs = (data?.jobs || []).filter((j: any) => {
    if (jobFilter === 'dead_failed') return j.status === 'dead' || j.status === 'failed';
    if (jobFilter === 'pending') return j.status === 'pending' || j.status === 'running';
    if (jobFilter === 'completed') return j.status === 'completed';
    return true;
  });

  return (
    <AppShell initialRole="admin">
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Protocol Operations & Outbox Queues"
            description="Inspect asynchronous outbox jobs, trace orders across DB/chain/AI via Correlation IDs, and monitor Hedera ATS supply reconciliation."
            breadcrumbs={[{ label: 'Admin', href: '/admin/ops' }, { label: 'Operations' }]}
          />

          {/* Action Notification Banner */}
          {successBanner && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button
                onClick={() => setSuccessBanner(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Quick Nav Links Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border border-border bg-surface-card text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Admin Shortcuts:</span>
              <Link
                href="/admin/audit"
                className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline"
              >
                <History className="w-3.5 h-3.5" />
                <span>Audit Log Chain →</span>
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/admin/demo"
                className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Demo Fault & Event Controls →</span>
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Order Reconciliation View →</span>
              </Link>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOpsData}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </Button>
          </div>

          {/* 1. Queue Counts & Health Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-surface-card">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Pending Jobs
              </span>
              <span className="text-2xl font-bold font-mono text-amber-300 mt-1 block">
                {data?.queueCounts?.pending ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-card">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Running
              </span>
              <span className="text-2xl font-bold font-mono text-blue-300 mt-1 block">
                {data?.queueCounts?.running ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-card">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Dead / Failed
              </span>
              <span className={`text-2xl font-bold font-mono mt-1 block ${
                (data?.queueCounts?.dead || 0) + (data?.queueCounts?.failed || 0) > 0 ? 'text-red-400' : 'text-muted-foreground'
              }`}>
                {(data?.queueCounts?.dead ?? 0) + (data?.queueCounts?.failed ?? 0)}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-card">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider block">
                Completed Jobs
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-300 mt-1 block">
                {data?.queueCounts?.completed ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-lg border border-border bg-surface-card col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Supply Reconciliation
                </span>
                <Badge variant={data?.supplyReconciliation?.status === 'PASS' ? 'success' : 'danger'}>
                  {data?.supplyReconciliation?.status === 'PASS' ? 'RECONCILED' : 'MISMATCH'}
                </Badge>
              </div>
              <div className="mt-1 flex items-baseline justify-between font-mono text-xs">
                <span>Chain: {data?.supplyReconciliation?.onChainSupply || 0} units</span>
                <span className="text-muted-foreground">|</span>
                <span>DB Completed: {data?.supplyReconciliation?.dbCompletedUnits || 0} units</span>
              </div>
            </div>
          </div>

          {/* 2. Outbox Jobs Table */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Outbox Queue &amp; Correlation Traces</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Trace background job execution, deduplication keys, retry counters, and error states.
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-lg border border-border text-xs">
                <button
                  onClick={() => setJobFilter('all')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    jobFilter === 'all' ? 'bg-surface-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({data?.jobs?.length || 0})
                </button>
                <button
                  onClick={() => setJobFilter('dead_failed')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    jobFilter === 'dead_failed' ? 'bg-surface-card text-red-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Dead / Failed ({(data?.queueCounts?.dead || 0) + (data?.queueCounts?.failed || 0)})
                </button>
                <button
                  onClick={() => setJobFilter('pending')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    jobFilter === 'pending' ? 'bg-surface-card text-amber-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending ({data?.queueCounts?.pending || 0})
                </button>
                <button
                  onClick={() => setJobFilter('completed')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    jobFilter === 'completed' ? 'bg-surface-card text-emerald-300 shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Completed ({data?.queueCounts?.completed || 0})
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">Job Type</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Attempts</th>
                    <th className="py-2.5 px-3">Correlation ID</th>
                    <th className="py-2.5 px-3">Dedupe Key</th>
                    <th className="py-2.5 px-3">Next Run / Updated</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground italic">
                        No jobs matching filter &ldquo;{jobFilter}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((j: any) => (
                      <tr key={j.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-foreground">
                          {j.type}
                          {j.lastError && (
                            <span className="block text-[11px] text-red-400 font-sans mt-0.5 truncate max-w-xs" title={j.lastError}>
                              {j.lastError}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              j.status === 'completed'
                                ? 'success'
                                : j.status === 'dead'
                                ? 'danger'
                                : j.status === 'failed'
                                ? 'danger'
                                : j.status === 'running'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {j.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {j.attempts} / {j.maxAttempts}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[var(--brand-primary)]" title={j.correlationId}>
                              {j.correlationId?.substring(0, 13)}...
                            </span>
                            <button
                              onClick={() => handleCopy(`corr-${j.id}`, j.correlationId)}
                              aria-label="Copy Correlation ID"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === `corr-${j.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground" title={j.dedupeKey}>
                          {j.dedupeKey?.substring(0, 14)}...
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {j.nextRunAt ? new Date(j.nextRunAt).toLocaleTimeString() : 'Immediate'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {(j.status === 'dead' || j.status === 'failed') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRetryJob(j);
                                setIsRetryDialogOpen(true);
                              }}
                              className="text-[11px] py-1 px-2.5 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Retry
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-[11px] italic">Automated</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Stuck Orders / Orders Requiring Review */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>Stuck &amp; Non-Terminal Orders</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Orders in intermediate or manual review states requiring operator inspection.
                </p>
              </div>
              <Link
                href="/admin/orders"
                className="text-xs text-[var(--brand-primary)] hover:underline font-medium"
              >
                View all orders →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted-foreground font-medium">
                    <th className="py-2.5 px-3">Order / Correlation ID</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Units</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Last Updated</th>
                    <th className="py-2.5 px-3 text-right">Settlement Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(data?.stuckOrders || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground italic">
                        No stuck orders. All settlement flows have reached terminal COMPLETED or EXPIRED status.
                      </td>
                    </tr>
                  ) : (
                    data.stuckOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-surface-elevated/40 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-medium text-[var(--brand-primary)]">
                          {o.id}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant={o.status === 'MANUAL_REVIEW' ? 'danger' : 'warning'}>
                            {o.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 font-mono">{o.units}</td>
                        <td className="py-2.5 px-3 font-mono">{formatINR(o.amountInr)}</td>
                        <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                          {new Date(o.updatedAt).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/admin/demo?orderId=${o.id}`}
                            className="inline-flex items-center gap-1 text-[11px] text-[var(--brand-primary)] hover:underline font-medium"
                          >
                            <span>Inspect Timeline</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. D1 Gate Verification & On-Chain Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* D1 Activation Conditions */}
            <div className="rounded-xl border border-border bg-surface-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>D1 Evidence-Gated Activation Status</span>
                </h3>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Asset: 0.0.11330441
                </span>
              </div>

              <div className="space-y-2">
                {(data?.activationGateConditions || []).map((c: any) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-lg border border-border bg-surface-elevated flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[var(--brand-primary)]">{c.id}</span>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{c.description}</p>
                      <span className="text-[10px] font-mono text-muted-foreground block">
                        Observed: {c.observed}
                      </span>
                    </div>
                    <Badge variant={c.status === 'PASS' ? 'success' : 'danger'}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Authorized Roles & Users (Role Management) */}
            <div className="rounded-xl border border-border bg-surface-card p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span>Authorized Role Assignments</span>
                </h3>
                <span className="text-[11px] text-muted-foreground">Admin-Audited</span>
              </div>

              <div className="space-y-2">
                {usersList.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-xs italic">
                    Loading authorized participants...
                  </div>
                ) : (
                  usersList.map((u: any) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-lg border border-border bg-surface-elevated flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-medium text-foreground flex items-center gap-2">
                          <span>{u.display_name}</span>
                          <span className="text-muted-foreground font-normal text-[11px]">({u.email})</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {u.roles?.map((r: string) => (
                            <Badge key={r} variant="neutral">
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUserForRole({
                            id: u.id,
                            displayName: u.display_name,
                            email: u.email,
                            roles: u.roles || [],
                          });
                          setIsRoleDialogOpen(true);
                        }}
                        className="text-[11px] py-1 px-2.5"
                      >
                        Manage
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 5. Role-Separated Action Provenance (Clean Display Names, Never Keys) */}
          <div className="rounded-xl border border-border bg-surface-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
              <Cpu className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>Role-Separated Action Provenance &amp; Security Boundary</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {(data?.roleSeparatedActors || []).map((a: any) => (
                <div key={a.role} className="p-3 rounded-lg border border-border bg-surface-elevated text-xs space-y-1.5">
                  <div className="font-semibold text-foreground">{a.role}</div>
                  <div className="text-[11px] font-medium text-[var(--brand-primary)]">{a.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">{a.entity}</div>
                  <div className="pt-1.5 border-t border-border/60">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Privileges
                    </span>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc list-inside">
                      {a.permissions?.map((p: string, idx: number) => (
                        <li key={idx} className="truncate" title={p}>
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Retry Safe Job Dialog */}
        <RetryJobDialog
          isOpen={isRetryDialogOpen}
          onClose={() => setIsRetryDialogOpen(false)}
          job={selectedRetryJob}
          onSuccess={(auditRef) => {
            setSuccessBanner(`Safe retry scheduled for job ${selectedRetryJob?.type} (Audit Log ID #${auditRef}).`);
            fetchOpsData();
          }}
        />

        {/* Manage User Role Dialog */}
        <RoleManagementDialog
          isOpen={isRoleDialogOpen}
          onClose={() => setIsRoleDialogOpen(false)}
          user={selectedUserForRole}
          onSuccess={(auditRef) => {
            setSuccessBanner(`Role updated successfully for ${selectedUserForRole?.displayName} (Audit Log ID #${auditRef}).`);
            fetchOpsData();
          }}
        />
      </PageContainer>
    </AppShell>
  );
}
