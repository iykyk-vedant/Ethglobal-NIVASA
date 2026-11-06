'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { SettlementTimeline } from '@/components/timeline/SettlementTimeline';
import { AllocationAttemptList, AllocationAttempt } from '@/components/timeline/AllocationAttemptList';
import { ReconciliationAssertionPanel, ReconciliationAssertions } from '@/components/timeline/ReconciliationAssertionPanel';
import { FaultArmDialog } from '@/components/admin/FaultArmDialog';
import { PaymentConfirmDialog } from '@/components/admin/PaymentConfirmDialog';
import { PropertyEventDialog } from '@/components/admin/PropertyEventDialog';
import { FaultType, ArmedFault } from '@/lib/settlement/faults';
import {
  Sliders,
  ShieldAlert,
  Zap,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Server,
} from 'lucide-react';

interface OrderSummary {
  id: string;
  status: string;
  units: string;
  amount_inr: string;
  created_at: string;
}

interface DemoFlagsResponse {
  appEnv: string;
  isProduction: boolean;
  flags: {
    DEMO_PAYMENTS: { enabled: boolean; description: string };
    DEMO_FAULTS: { enabled: boolean; description: string };
    DEMO_EVENTS: { enabled: boolean; description: string };
  };
}

export default function AdminDemoControlsPage() {
  const [flags, setFlags] = useState<DemoFlagsResponse | null>(null);
  const [activeFaults, setActiveFaults] = useState<ArmedFault[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderData, setSelectedOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Dialog States
  const [isFaultDialogOpen, setIsFaultDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isPropertyEventDialogOpen, setIsPropertyEventDialogOpen] = useState(false);

  // Feedback & Audit Reference State
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    auditRef?: string | number;
    type: 'success' | 'error';
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  // 1. Fetch server-backed demo flag status, faults, and orders
  const refreshState = useCallback(async () => {
    try {
      // Fetch server flags
      const flagsRes = await fetch('/api/demo/flags', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (flagsRes.ok) {
        const json = await flagsRes.json();
        setFlags(json);
      }

      // Fetch fault status
      const faultRes = await fetch('/api/demo/faults', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (faultRes.ok) {
        const json = await faultRes.json();
        setActiveFaults(json.activeFaults || []);
      }

      // Fetch recent orders
      const ordersRes = await fetch('/api/investments?limit=10', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        const list = json.orders || [];
        setOrders(list);
        if (list.length > 0 && !selectedOrderId) {
          setSelectedOrderId(list[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load demo control state:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedOrderId]);

  // 2. Fetch selected order detail
  const fetchSelectedOrder = useCallback(async (orderId: string) => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/investments/${orderId}`, {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedOrderData(json);
      }
    } catch (err) {
      console.error('Failed to load order detail:', err);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useEffect(() => {
    if (selectedOrderId) {
      fetchSelectedOrder(selectedOrderId);
    }
  }, [selectedOrderId, fetchSelectedOrder]);

  // Confirm Simulated Payment
  const handleConfirmPayment = async (orderId: string, reason: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({ orderId, reason }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Payment confirmation failed');
      }

      setActionMessage({
        text: `Simulated payment confirmed! Payment ref: ${json.paymentRef}`,
        auditRef: json.auditId ? `Audit Row #${json.auditId}` : undefined,
        type: 'success',
      });
      await fetchSelectedOrder(orderId);
      await refreshState();
    } finally {
      setIsProcessing(false);
    }
  };

  // Arm Fault
  const handleArmFault = async (faultType: FaultType, reason: string, orderId?: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({
          faultType,
          orderId: orderId || null,
          reason,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to arm fault');
      }

      setActionMessage({
        text: `Armed fault '${faultType}' successfully.`,
        auditRef: json.auditId ? `Audit Row #${json.auditId}` : undefined,
        type: 'success',
      });
      await refreshState();
    } finally {
      setIsProcessing(false);
    }
  };

  // Cancel Fault
  const handleCancelFault = async (faultId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/faults', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({
          faultId,
          reason: 'Cancelled via Admin Console',
        }),
      });

      if (res.ok) {
        setActionMessage({
          text: 'Fault injection cancelled.',
          type: 'success',
        });
        await refreshState();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply Scripted Property Event
  const handleApplyPropertyEvent = async (propertyId: string, eventId: string, reason: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/property-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({ propertyId, eventId, reason }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to apply property event');
      }

      setActionMessage({
        text: `Scripted property event applied (Snapshot #${json.snapshot?.snapshot_no}). AI change intelligence updated.`,
        auditRef: json.auditId ? `Audit Row #${json.auditId}` : undefined,
        type: 'success',
      });
      await refreshState();
    } finally {
      setIsProcessing(false);
    }
  };

  // Run Worker
  const handleRunWorker = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/cron/worker', {
        method: 'POST',
        headers: {
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({
          text: `Settlement worker executed: ${json.processed || 0} jobs processed.`,
          type: 'success',
        });
        if (selectedOrderId) {
          await fetchSelectedOrder(selectedOrderId);
        }
      } else {
        setActionMessage({
          text: `Worker error: ${json.error?.message || 'Execution failed'}`,
          type: 'error',
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const attempts: AllocationAttempt[] = (selectedOrderData?.attempts || []).map((a: any) => ({
    id: a.id,
    attempt_no: a.attemptNo ?? a.attempt_no,
    chain_tx_id: a.chainTxId ?? a.chain_tx_id,
    signed_tx_hash: a.signedTxHash ?? a.signed_tx_hash,
    status: a.status,
    error: a.error,
    created_at: a.createdAt ?? a.created_at,
    confirmed_at: a.confirmedAt ?? a.confirmed_at,
  }));

  const assertions: ReconciliationAssertions | null = selectedOrderData?.assertions
    ? {
        unitsOrdered: selectedOrderData.assertions.unitsOrdered,
        unitsOnChainConfirmed: selectedOrderData.assertions.unitsOnChainConfirmed,
        attemptsUsed: selectedOrderData.assertions.attemptsUsed,
        duplicatesPrevented: selectedOrderData.assertions.duplicatesPrevented,
        isReconciled: selectedOrderData.assertions.isReconciled,
        confirmedTxId: attempts.find((a) => a.status === 'confirmed')?.chain_tx_id || null,
      }
    : null;

  const paymentsEnabled = Boolean(flags?.flags?.DEMO_PAYMENTS?.enabled);
  const faultsEnabled = Boolean(flags?.flags?.DEMO_FAULTS?.enabled);
  const eventsEnabled = Boolean(flags?.flags?.DEMO_EVENTS?.enabled);
  const isProduction = Boolean(flags?.isProduction);

  return (
    <AppShell
      initialRole="admin"
      demoFlags={{
        paymentsEnabled,
        faultsEnabled,
      }}
    >
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Demo Controls & Failure Simulator"
            description="Server-backed demonstration switches, one-shot fault injectors, and scripted property events (ARCH §14, §16, §19, §21)."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Demo Controls' },
            ]}
          />

          {/* Action / Audit Feedback Banner */}
          {actionMessage && (
            <div
              className={`p-3.5 rounded-lg border text-xs font-mono flex items-center justify-between gap-3 ${
                actionMessage.type === 'success'
                  ? 'bg-[var(--surface-sunken)] border-[var(--status-success)]/40 text-[var(--text-primary)]'
                  : 'bg-[var(--surface-sunken)] border-[var(--status-danger)]/40 text-[var(--status-danger)]'
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] shrink-0" />
                <span>{actionMessage.text}</span>
                {actionMessage.auditRef && (
                  <Link
                    href="/admin/audit"
                    className="inline-flex items-center gap-1 font-semibold underline text-[var(--brand-primary)] hover:opacity-80 ml-2"
                  >
                    <span>[{actionMessage.auditRef} in Audit Chain]</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-1"
                aria-label="Dismiss banner"
              >
                ✕
              </button>
            </div>
          )}

          {/* Server-Backed Demo Flags Overview */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    Server-Backed Demo Flag State (PLAN M14.3, ARCH §21)
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Live environment parameters from server state. All demo capabilities strictly refuse in production.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isProduction ? 'danger' : 'neutral'} className="text-xs font-mono">
                  APP_ENV: {flags?.appEnv || 'development'}
                </Badge>
                <Button
                  variant="outline"
                  onClick={refreshState}
                  disabled={loading || isProcessing}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* DEMO_PAYMENTS Flag */}
              <div className="p-3.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">DEMO_PAYMENTS</span>
                  <Badge variant={paymentsEnabled ? 'success' : 'neutral'} className="text-[10px] font-mono">
                    {paymentsEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {flags?.flags?.DEMO_PAYMENTS?.description || 'Simulated INR payment confirmation flow'}
                </p>
              </div>

              {/* DEMO_FAULTS Flag */}
              <div className="p-3.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">DEMO_FAULTS</span>
                  <Badge variant={faultsEnabled ? 'warning' : 'neutral'} className="text-[10px] font-mono">
                    {faultsEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {flags?.flags?.DEMO_FAULTS?.description || 'Settlement failure and idempotency injection'}
                </p>
              </div>

              {/* DEMO_EVENTS Flag */}
              <div className="p-3.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">DEMO_EVENTS</span>
                  <Badge variant={eventsEnabled ? 'success' : 'neutral'} className="text-[10px] font-mono">
                    {eventsEnabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {flags?.flags?.DEMO_EVENTS?.description || 'Scripted property performance events'}
                </p>
              </div>
            </div>
          </section>

          {/* Controls Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Settlement Fault Injection */}
            <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      1. One-Shot Settlement Faults
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      ARCH §14.7, PRD FR-5.10. Acts on real Hedera Testnet code path.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsFaultDialogOpen(true)}
                  disabled={!faultsEnabled || isProduction || isProcessing}
                  className="text-xs"
                  data-testid="arm-fault-button"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  <span>Arm Fault...</span>
                </Button>
              </div>

              {activeFaults.length === 0 ? (
                <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] italic text-center">
                  No active faults armed. Normal settlement path active.
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">
                    Armed Fault:
                  </span>
                  {activeFaults.map((fault) => (
                    <div
                      key={fault.id}
                      className="p-3 rounded-lg border border-[var(--status-warning)]/40 bg-[var(--surface-sunken)] text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <Badge variant="warning" className="text-[10px] font-mono">
                          {fault.fault_type}
                        </Badge>
                        <Button
                          variant="outline"
                          onClick={() => handleCancelFault(fault.id)}
                          disabled={isProcessing}
                          className="text-[10px] py-0.5 px-2 h-auto text-[var(--status-danger)]"
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-[var(--text-secondary)] font-mono text-[11px]">
                        Target: {fault.order_id ? `Order ${fault.order_id.slice(0, 8)}...` : 'Next allocation'}
                        <br />
                        Reason: {fault.reason}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Scripted Property Events */}
            <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                      2. Scripted Property Events
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      ARCH §16.3, PRD FR-8.2. Appends immutable Snapshot #2.
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setIsPropertyEventDialogOpen(true)}
                  disabled={!eventsEnabled || isProduction || isProcessing}
                  className="text-xs"
                  data-testid="apply-property-event-btn"
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span>Apply Event...</span>
                </Button>
              </div>

              <div className="p-3.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs space-y-2">
                <span className="font-semibold text-[var(--text-primary)] block">
                  Scenario: New Valuation Report (Brigade Tech Gardens)
                </span>
                <p className="text-[var(--text-secondary)]">
                  Appends Snapshot #2 with valuation ₹10.50 Cr (+5%) and occupancy 85% (-10%). Demonstrates 0G change intelligence, metric deltas, and divergence detection.
                </p>
                <div className="pt-1">
                  <Link
                    href="/intelligence/11111111-1111-1111-1111-111111111111"
                    className="inline-flex items-center gap-1 text-[var(--brand-primary)] hover:underline font-medium text-xs"
                  >
                    <span>View Property Intelligence Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* 3. Order Stepper & Settlement Inspector */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  3. Settlement Flow Stepper &amp; Test Order Inspector
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Inspect order states, trigger simulated payment receipts, and execute the background settlement worker.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleRunWorker}
                  disabled={isProcessing}
                  className="text-xs"
                  data-testid="run-worker-button"
                >
                  <Zap className="w-3.5 h-3.5 mr-1 text-[var(--brand-primary)]" />
                  <span>Run Settlement Worker</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label htmlFor="order-selector" className="font-medium text-[var(--text-primary)] block">
                  Select Order to Inspect:
                </label>
                <select
                  id="order-selector"
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-mono text-xs focus:ring-2 focus:ring-[var(--brand-primary)] focus:outline-none"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id.slice(0, 8)}... — Status: {o.status} ({o.units} units)
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrderData && (
                <div className="flex items-end gap-2">
                  {selectedOrderData.order?.status === 'PAYMENT_PENDING' && (
                    <Button
                      variant="primary"
                      onClick={() => setIsPaymentDialogOpen(true)}
                      disabled={!paymentsEnabled || isProduction || isProcessing}
                      className="text-xs"
                      data-testid="admin-confirm-payment-btn"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      <span>Confirm Simulated Payment...</span>
                    </Button>
                  )}
                  <Link
                    href={`/investor/orders/${selectedOrderId}`}
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline font-medium p-2.5"
                  >
                    <span>View Investor Order Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Settlement Timeline & Assertions for Selected Order */}
          {selectedOrderData && (
            <>
              <SettlementTimeline
                currentStatus={selectedOrderData.order.status}
                createdAt={selectedOrderData.order.createdAt}
                updatedAt={selectedOrderData.order.updatedAt}
                simulatedPaymentRef={selectedOrderData.order.simulatedPaymentRef}
                attempts={attempts}
              />

              <AllocationAttemptList attempts={attempts} />

              {assertions && (
                <ReconciliationAssertionPanel
                  assertions={assertions}
                  orderStatus={selectedOrderData.order.status}
                />
              )}
            </>
          )}

          {/* Fault Arm Confirmation Dialog */}
          <FaultArmDialog
            isOpen={isFaultDialogOpen}
            onClose={() => setIsFaultDialogOpen(false)}
            onConfirm={handleArmFault}
            targetOrderId={selectedOrderId}
            isSubmitting={isProcessing}
          />

          {/* Simulated Payment Confirmation Dialog */}
          <PaymentConfirmDialog
            isOpen={isPaymentDialogOpen}
            onClose={() => setIsPaymentDialogOpen(false)}
            onConfirm={handleConfirmPayment}
            order={selectedOrderData?.order ? {
              id: selectedOrderData.order.id,
              units: selectedOrderData.order.units,
              amount_inr: selectedOrderData.order.amountInr,
            } : null}
            isSubmitting={isProcessing}
          />

          {/* Scripted Property Event Confirmation Dialog */}
          <PropertyEventDialog
            isOpen={isPropertyEventDialogOpen}
            onClose={() => setIsPropertyEventDialogOpen(false)}
            onConfirm={handleApplyPropertyEvent}
            propertyId="11111111-1111-1111-1111-111111111111"
            isSubmitting={isProcessing}
          />
        </div>
      </PageContainer>
    </AppShell>
  );
}
