'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SettlementTimeline } from '@/components/timeline/SettlementTimeline';
import { AllocationAttemptList, AllocationAttempt } from '@/components/timeline/AllocationAttemptList';
import { ReceiptLinkCard } from '@/components/investor/ReceiptLinkCard';
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

interface OrderDetail {
  id: string;
  status: string;
  units: string;
  unitPriceInr: string;
  amountInr: string;
  rightsVersion: number;
  rightsDocumentHash: string;
  ackWallet: string;
  receiptToken?: string;
  simulatedPaymentRef?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface OfferingMeta {
  id: string;
  token_name: string;
  token_symbol: string;
  ats_asset_ref: string;
  token_contract_id: string;
  token_evm_address: string;
  chain_id: number;
}

interface AssertionsMeta {
  unitsOrdered: string;
  unitsOnChainConfirmed: string;
  attemptsUsed: number;
  duplicatesPrevented: number;
  isReconciled: boolean;
}

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [offering, setOffering] = useState<OfferingMeta | null>(null);
  const [attempts, setAttempts] = useState<AllocationAttempt[]>([]);
  const [assertions, setAssertions] = useState<AssertionsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingWorker, setIsProcessingWorker] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<string>('');

  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';
  const DEMO_INVESTOR_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';

  // Fetch Order State from backend
  const fetchOrder = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch(`/api/investments/${id}`, {
        headers: {
          'x-demo-user-id': DEMO_INVESTOR_ID,
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load order details');
      }

      const json = await res.json();
      if (json.success) {
        setOrder((prev) => {
          if (prev && prev.status !== json.order.status) {
            setStatusAnnouncement(
              `Order status updated to ${json.order.status.replace(/_/g, ' ')}`
            );
          }
          return json.order;
        });
        setOffering(json.offering);
        // Normalize attempt fields
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
        setAssertions(json.assertions);
        setLastPolledAt(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching order');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const orderStatus = order?.status;

  // Polling every 3 seconds while in non-terminal states (UI §8.7)
  useEffect(() => {
    if (!orderStatus) return;

    const nonTerminalStatuses = [
      'UNITS_RESERVED',
      'PAYMENT_PENDING',
      'PAYMENT_CONFIRMED',
      'ALLOCATION_PENDING',
      'ALLOCATION_SUBMITTED',
      'ALLOCATION_CONFIRMED',
    ];

    if (!nonTerminalStatuses.includes(orderStatus)) {
      return; // Stop polling once terminal state reached (COMPLETED, FAILED, etc.)
    }

    const interval = setInterval(() => {
      fetchOrder(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [orderStatus, fetchOrder]);

  // Handle Simulated Payment Confirmation (Admin action in Demo Mode)
  const handleConfirmSimulatedPayment = async () => {
    try {
      setIsProcessingPayment(true);
      const res = await fetch('/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({
          orderId: id,
          simulatedPaymentRef: `DEMO_INR_${Date.now().toString().slice(-6)}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Payment confirmation failed');
      }

      setStatusAnnouncement('Simulated payment confirmed. Enqueuing Hedera allocation job.');
      await fetchOrder(true);

      // Trigger cron worker to process job immediately for seamless demo
      handleRunWorker();
    } catch (err: any) {
      alert(`Error confirming payment: ${err.message}`);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Trigger Cron Outbox Worker
  const handleRunWorker = async () => {
    try {
      setIsProcessingWorker(true);
      await fetch('/api/cron/worker', {
        method: 'POST',
        headers: {
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
      });
      await fetchOrder(true);
    } catch (e) {
      // Worker ran in background
    } finally {
      setIsProcessingWorker(false);
    }
  };

  if (loading) {
    return (
      <AppShell initialRole="investor">
        <PageContainer maxWidth="xl">
          <div className="space-y-6 animate-pulse py-8" data-testid="order-loading-skeleton">
            <div className="h-8 bg-surface-muted rounded w-64" />
            <div className="h-32 bg-surface-muted rounded" />
            <div className="h-64 bg-surface-muted rounded" />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  if (error || !order) {
    return (
      <AppShell initialRole="investor">
        <PageContainer maxWidth="xl">
          <div className="space-y-6 py-8" data-testid="order-error-state">
            <div className="p-6 rounded-lg bg-surface-card border border-status-danger/40 text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-status-danger mx-auto" />
              <h2 className="text-lg font-semibold text-text-primary">
                Unable to Load Settlement Order
              </h2>
              <p className="text-xs text-text-secondary">{error || 'Order record not found.'}</p>
              <div className="pt-2">
                <Link href="/investor">
                  <Button variant="outline" className="text-xs">
                    Return to Investor Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  const isCompleted = order.status === 'COMPLETED';
  const isPaymentPending = order.status === 'PAYMENT_PENDING' || order.status === 'UNITS_RESERVED';

  return (
    <AppShell initialRole="investor">
      <PageContainer maxWidth="xl">
        <div className="space-y-6 pb-12" data-testid="order-detail-page">
          {/* Accessible Live Region (Announces updates without stealing focus) */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {statusAnnouncement}
          </div>

          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Investor Dashboard', href: '/investor' },
              { label: `Order #${order.id.slice(0, 8)}` },
            ]}
          />

          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                  Order ID: {order.id}
                </span>
                <Badge variant="info" className="text-[10px] font-mono uppercase">
                  SIMULATED SETTLEMENT
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                Settlement Order Detail
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Hedera Testnet allocation audit trail, canonical state machine, and proof of settlement.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => fetchOrder(false)}
                className="text-xs flex items-center gap-1.5"
                title="Refresh order state"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync</span>
              </Button>
              <Badge
                variant={
                  isCompleted
                    ? 'success'
                    : order.status.includes('FAILED')
                    ? 'danger'
                    : 'warning'
                }
                className="text-xs font-mono"
              >
                {order.status}
              </Badge>
            </div>
          </div>

          {/* Order Financial & Terms Overview */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-semibold text-text-primary">
                Order Parameters &amp; Signed Acknowledgement
              </h2>
              <span className="text-xs font-mono text-text-secondary">
                Last polled: {lastPolledAt || 'Just now'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 rounded bg-surface-muted border border-border font-sans">
                <span className="text-[11px] text-text-secondary block">Offering / Asset</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block truncate">
                  {offering?.token_symbol || 'PROPERTY-MH-001'}
                </span>
                <span className="text-[10px] text-text-secondary font-mono">
                  ATS: {offering?.token_contract_id || '0.0.11330441'}
                </span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block font-sans">Units Reserved</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block">
                  {order.units} units
                </span>
                <span className="text-[10px] text-text-secondary">@ ₹{order.unitPriceInr}</span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block font-sans">Total Amount (INR)</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block">
                  {formatINR(order.amountInr)}
                </span>
                <span className="text-[10px] text-text-secondary font-sans">Exact decimal math</span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block font-sans">Signed Wallet</span>
                <span className="text-[11px] font-semibold text-text-primary mt-0.5 block truncate" title={order.ackWallet}>
                  {order.ackWallet.slice(0, 8)}...{order.ackWallet.slice(-6)}
                </span>
                <span className="text-[10px] text-text-secondary font-sans">EIP-191 consent</span>
              </div>
            </div>

            <div className="p-3 rounded bg-surface-muted border border-border text-xs space-y-1 font-mono">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-secondary font-sans">Rights Document Hash:</span>
                <span className="text-text-primary truncate max-w-[320px]" title={order.rightsDocumentHash}>
                  {order.rightsDocumentHash}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-text-secondary font-sans">Simulated Payment Reference:</span>
                <span className="text-text-primary font-semibold">
                  {order.simulatedPaymentRef || 'Awaiting simulated payment'}
                </span>
              </div>
            </div>
          </div>

          {/* Simulated Payment Action (Demo Thin Slice Flow) */}
          {isPaymentPending && (
            <div
              className="p-5 rounded-lg border border-brand-primary/40 bg-surface-card shadow-sm space-y-3"
              data-testid="simulated-payment-panel"
            >
              <div className="flex items-center gap-2 text-brand-primary">
                <CreditCard className="w-5 h-5" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Simulated Payment Step (Demo Environment)
                </h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                In production, this step is verified via bank or escrow API webhooks. For this prototype,
                confirm simulated payment to advance the canonical state machine to{' '}
                <code className="text-text-primary font-mono">PAYMENT_CONFIRMED</code> and trigger the
                Hedera Testnet allocation worker.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button
                  variant="primary"
                  onClick={handleConfirmSimulatedPayment}
                  isLoading={isProcessingPayment}
                  disabled={isProcessingPayment}
                  className="text-xs font-semibold"
                  data-testid="confirm-simulated-payment-button"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  <span>Confirm Simulated Payment (Advance Flow)</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRunWorker}
                  isLoading={isProcessingWorker}
                  disabled={isProcessingWorker}
                  className="text-xs"
                  title="Run background settlement worker"
                >
                  <Zap className="w-3.5 h-3.5 mr-1" />
                  <span>Execute Settlement Worker</span>
                </Button>
              </div>
            </div>
          )}

          {/* Settlement Timeline */}
          <SettlementTimeline
            currentStatus={order.status}
            createdAt={order.createdAt}
            updatedAt={order.updatedAt}
            simulatedPaymentRef={order.simulatedPaymentRef}
            attempts={attempts.map((a) => ({
              attempt_no: a.attempt_no,
              chain_tx_id: a.chain_tx_id,
              status: a.status,
              created_at: a.created_at,
              confirmed_at: a.confirmed_at,
              error: a.error,
            }))}
          />

          {/* Allocation Attempts List (Handles unknown as 'Checking transaction outcome') */}
          <AllocationAttemptList attempts={attempts} />

          {/* Recovery Assertions Panel (ARCH §14.7) */}
          {assertions && (
            <div
              className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-3"
              data-testid="recovery-assertions-panel"
            >
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Settlement Recovery Assertions (ARCH §14.7)
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Immutable verification metrics from reconciliation worker.
                  </p>
                </div>
                <Badge
                  variant={assertions.isReconciled ? 'success' : 'neutral'}
                  className="text-xs"
                >
                  {assertions.isReconciled ? 'Reconciled' : 'Pending Verification'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded bg-surface-muted border border-border">
                  <span className="text-[11px] text-text-secondary font-sans block">Units Ordered</span>
                  <span className="text-base font-bold text-text-primary mt-0.5 block">
                    {assertions.unitsOrdered}
                  </span>
                </div>

                <div className="p-3 rounded bg-surface-muted border border-border">
                  <span className="text-[11px] text-text-secondary font-sans block">
                    Units on Chain Confirmed
                  </span>
                  <span
                    className={`text-base font-bold mt-0.5 block ${
                      assertions.isReconciled ? 'text-status-success' : 'text-text-primary'
                    }`}
                  >
                    {assertions.unitsOnChainConfirmed}
                  </span>
                </div>

                <div className="p-3 rounded bg-surface-muted border border-border">
                  <span className="text-[11px] text-text-secondary font-sans block">Attempts Used</span>
                  <span className="text-base font-bold text-text-primary mt-0.5 block">
                    {assertions.attemptsUsed}
                  </span>
                </div>

                <div className="p-3 rounded bg-surface-muted border border-border">
                  <span className="text-[11px] text-text-secondary font-sans block">
                    Duplicates Prevented
                  </span>
                  <span className="text-base font-bold text-brand-primary mt-0.5 block">
                    {assertions.duplicatesPrevented}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Receipt Link Card (Exposed ONLY when order.status === 'COMPLETED') */}
          {order.receiptToken && (
            <ReceiptLinkCard
              receiptToken={order.receiptToken}
              orderId={order.id}
              orderStatus={order.status}
            />
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
