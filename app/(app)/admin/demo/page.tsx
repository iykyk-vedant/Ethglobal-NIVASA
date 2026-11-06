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
import { FaultType, ArmedFault } from '@/lib/settlement/faults';
import {
  Sliders,
  ShieldAlert,
  Zap,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface OrderSummary {
  id: string;
  status: string;
  units: string;
  amount_inr: string;
  created_at: string;
}

export default function AdminDemoControlsPage() {
  const [activeFaults, setActiveFaults] = useState<ArmedFault[]>([]);
  const [isEnabled, setIsEnabled] = useState(false);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderData, setSelectedOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isArmDialogOpen, setIsArmDialogOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  // 1. Fetch live fault status & orders list
  const refreshState = useCallback(async () => {
    try {
      // Check fault status
      const faultRes = await fetch('/api/demo/faults', {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });
      if (faultRes.ok) {
        const json = await faultRes.json();
        setIsEnabled(json.enabled);
        setActiveFaults(json.activeFaults || []);
      }

      // Fetch recent orders for demo inspection
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

  // 2. Fetch selected order detail for timeline & assertions
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

  // Handle Arm Fault
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

      setActionMessage(`Armed fault '${faultType}' successfully. Audit logged.`);
      await refreshState();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Cancel Fault
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
        setActionMessage('Fault injection cancelled.');
        await refreshState();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Confirm Payment for selected order
  const handleConfirmPayment = async () => {
    if (!selectedOrderId) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({ orderId: selectedOrderId }),
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage('Simulated payment confirmed! Outbox job enqueued.');
        await fetchSelectedOrder(selectedOrderId);
      } else {
        setActionMessage(`Error: ${json.error?.message || 'Payment confirmation failed'}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Run Worker
  const handleRunWorker = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/cron/worker', {
        method: 'POST',
        headers: {
          'x-cron-secret': process.env.NEXT_PUBLIC_CRON_SECRET || 'test-cron-secret-nivasa-secure-m4',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage(`Settlement worker executed: ${json.processed || 0} jobs processed.`);
        if (selectedOrderId) {
          await fetchSelectedOrder(selectedOrderId);
        }
      } else {
        setActionMessage(`Worker error: ${json.error?.message || 'Execution failed'}`);
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

  return (
    <AppShell
      initialRole="admin"
      demoFlags={{
        paymentsEnabled: true,
        faultsEnabled: isEnabled,
      }}
    >
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title="Settlement Fault Injector & Assertion Ops"
            description="Live demonstration controls for ARCH §14.7 settlement failure and recovery verification."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Demo Controls' },
            ]}
          />

          {actionMessage && (
            <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs font-mono text-[var(--text-primary)] flex items-center justify-between">
              <span>{actionMessage}</span>
              <button
                type="button"
                onClick={() => setActionMessage(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>
          )}

          {/* Fault Status Card */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[var(--brand-primary)]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    One-Shot Fault Injection Controls (ARCH §14.7, PRD FR-5.10)
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Acts on the real code path and real Hedera Testnet chain. Refuses in production.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant={isEnabled ? 'warning' : 'neutral'} className="text-xs font-mono">
                  {isEnabled ? 'FAULT INJECTION ENABLED (DEMO)' : 'DISABLED'}
                </Badge>
                <Button
                  variant="primary"
                  onClick={() => setIsArmDialogOpen(true)}
                  disabled={!isEnabled}
                  className="text-xs"
                  data-testid="arm-fault-button"
                >
                  <ShieldAlert className="w-4 h-4 mr-1.5" />
                  <span>Arm Fault...</span>
                </Button>
              </div>
            </div>

            {/* Currently Active Faults */}
            {activeFaults.length === 0 ? (
              <div className="p-4 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] italic text-center">
                No faults currently armed. Normal issuance path active.
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  Armed Fault Queue:
                </span>
                {activeFaults.map((fault) => (
                  <div
                    key={fault.id}
                    className="p-3.5 rounded-lg border border-[var(--status-warning)]/40 bg-[var(--surface-sunken)] text-xs space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" className="text-[11px] font-mono">
                          {fault.fault_type}
                        </Badge>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {fault.order_id ? `Target: Order ${fault.order_id}` : 'Target: Next Allocation'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelFault(fault.id)}
                        disabled={isProcessing}
                        className="text-[11px] py-1 px-2.5 h-auto text-[var(--status-danger)]"
                      >
                        Cancel Fault
                      </Button>
                    </div>
                    <p className="text-[var(--text-secondary)] font-mono text-[11px]">
                      Reason: {fault.reason} · Armed at: {fault.created_at}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Workflow Executor & Order Selector */}
          <section className="bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Settlement Flow Stepper &amp; Test Order Inspector
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Select an order to step through simulated payment, worker execution, and reconciliation recovery.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={refreshState}
                  disabled={isProcessing}
                  className="text-xs"
                  title="Refresh state"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>Refresh</span>
                </Button>
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

            {/* Order Selector */}
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
                      onClick={handleConfirmPayment}
                      disabled={isProcessing}
                      className="text-xs"
                      data-testid="admin-confirm-payment-btn"
                    >
                      <CreditCard className="w-4 h-4 mr-1.5" />
                      <span>Confirm Simulated Payment</span>
                    </Button>
                  )}
                  <Link
                    href={`/investor/orders/${selectedOrderId}`}
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline font-medium p-2.5"
                  >
                    <span>View Investor Page</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Settlement Timeline for Selected Order */}
          {selectedOrderData && (
            <>
              <SettlementTimeline
                currentStatus={selectedOrderData.order.status}
                createdAt={selectedOrderData.order.createdAt}
                updatedAt={selectedOrderData.order.updatedAt}
                simulatedPaymentRef={selectedOrderData.order.simulatedPaymentRef}
                attempts={attempts}
              />

              {/* Allocation Attempts List (Handles unknown as 'Checking transaction outcome') */}
              <AllocationAttemptList attempts={attempts} />

              {/* Recovery Assertions Panel (ARCH §14.7) */}
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
            isOpen={isArmDialogOpen}
            onClose={() => setIsArmDialogOpen(false)}
            onConfirm={handleArmFault}
            targetOrderId={selectedOrderId}
            isSubmitting={isProcessing}
          />
        </div>
      </PageContainer>
    </AppShell>
  );
}
