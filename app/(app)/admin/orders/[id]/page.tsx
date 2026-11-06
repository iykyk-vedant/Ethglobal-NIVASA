'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { PageHeader } from '@/components/shell/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SettlementTimeline } from '@/components/timeline/SettlementTimeline';
import { AllocationAttemptList, AllocationAttempt } from '@/components/timeline/AllocationAttemptList';
import { ReconciliationAssertionPanel, ReconciliationAssertions } from '@/components/timeline/ReconciliationAssertionPanel';
import { formatINR } from '@/lib/money/decimal';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  RefreshCw,
  CreditCard,
  Zap,
} from 'lucide-react';

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: OrderPageProps) {
  const { id } = use(params);

  const [order, setOrder] = useState<any>(null);
  const [offering, setOffering] = useState<any>(null);
  const [attempts, setAttempts] = useState<AllocationAttempt[]>([]);
  const [assertions, setAssertions] = useState<ReconciliationAssertions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/investments/${id}`, {
        headers: { 'x-demo-user-id': DEMO_ADMIN_ID },
      });

      if (!res.ok) {
        throw new Error('Failed to load order details');
      }

      const json = await res.json();
      if (json.success) {
        setOrder(json.order);
        setOffering(json.offering);
        const mappedAttempts: AllocationAttempt[] = (json.attempts || []).map((a: any) => ({
          id: a.id,
          attempt_no: a.attemptNo ?? a.attempt_no,
          chain_tx_id: a.chainTxId ?? a.chain_tx_id,
          signed_tx_hash: a.signedTxHash ?? a.signed_tx_hash,
          status: a.status,
          error: a.error,
          created_at: a.createdAt ?? a.created_at,
          confirmed_at: a.confirmedAt ?? a.confirmed_at,
        }));
        setAttempts(mappedAttempts);

        if (json.assertions) {
          setAssertions({
            ...json.assertions,
            confirmedTxId: mappedAttempts.find((a) => a.status === 'confirmed')?.chain_tx_id || null,
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({ orderId: id }),
      });
      if (res.ok) {
        await fetchOrder();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunWorker = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/cron/worker', {
        method: 'POST',
        headers: {
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
      });
      if (res.ok) {
        await fetchOrder();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppShell initialRole="admin">
      <PageContainer>
        <div className="space-y-6">
          <PageHeader
            title={`Admin Order Ops: ${id.slice(0, 8)}...`}
            description="Full settlement lifecycle audit, sequential attempts, HashScan links, and reconciliation assertions."
            breadcrumbs={[
              { label: 'Admin', href: '/admin/ops' },
              { label: 'Orders', href: '/admin/orders' },
              { label: id.slice(0, 8) },
            ]}
          />

          {loading ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              Loading order settlement details...
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-[var(--status-danger)]/10 border border-[var(--status-danger)]/20 text-xs text-[var(--status-danger)]">
              {error}
            </div>
          ) : order ? (
            <div className="space-y-6">
              {/* Order Meta Header */}
              <div className="p-5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                  <div className="space-y-1">
                    <span className="text-xs font-mono text-[var(--text-secondary)]">Order ID: {order.id}</span>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      {order.units} Units · {formatINR(order.amountInr)}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={order.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {order.status}
                    </Badge>
                    <Button
                      variant="outline"
                      onClick={fetchOrder}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      <span>Refresh</span>
                    </Button>
                  </div>
                </div>

                {/* Quick actions for demo testing */}
                {order.status === 'PAYMENT_PENDING' && (
                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      variant="primary"
                      onClick={handleConfirmPayment}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" />
                      <span>Confirm Simulated Payment</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleRunWorker}
                      disabled={isProcessing}
                      className="text-xs"
                    >
                      <Zap className="w-3.5 h-3.5 mr-1 text-[var(--brand-primary)]" />
                      <span>Execute Worker</span>
                    </Button>
                  </div>
                )}
              </div>

              {/* Settlement Timeline */}
              <SettlementTimeline
                currentStatus={order.status}
                createdAt={order.createdAt}
                updatedAt={order.updatedAt}
                simulatedPaymentRef={order.simulatedPaymentRef}
                attempts={attempts}
              />

              {/* Allocation Attempts List (Handles unknown as 'Checking transaction outcome') */}
              <AllocationAttemptList attempts={attempts} />

              {/* Recovery Assertions Panel (ARCH §14.7, UI §8.7) */}
              {assertions && (
                <ReconciliationAssertionPanel
                  assertions={assertions}
                  orderStatus={order.status}
                />
              )}
            </div>
          ) : null}
        </div>
      </PageContainer>
    </AppShell>
  );
}
