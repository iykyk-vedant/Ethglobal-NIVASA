import React from 'react';
import Link from 'next/link';
import { getAdminDbClient } from '@/lib/db/admin';
import { readHolderBalance } from '@/lib/hedera/chain-reads';
import { getHashScanTxUrl } from '@/lib/hedera/config';
import { formatINR, toMoneyString } from '@/lib/money/decimal';
import { AppShell } from '@/components/shell/AppShell';
import { PageContainer } from '@/components/shell/PageContainer';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Wallet,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  FileText,
  Building,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InvestorDashboardPage() {
  const admin = getAdminDbClient();

  // Seeded Demo Investor: Rahul Mehta
  const DEMO_INVESTOR_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';

  // 1. Fetch Investor Profile
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', DEMO_INVESTOR_ID)
    .single();

  // 2. Fetch Active Demo Offering
  const { data: offering } = await admin
    .from('offerings')
    .select('*')
    .eq('token_symbol', 'PROPERTY-MH-001')
    .single();

  const offeringId = offering?.id || '33333333-3333-3333-3333-333333333333';

  // 3. Fetch Investor Eligibility
  const { data: eligibility } = await admin
    .from('investor_eligibility')
    .select('*')
    .eq('user_id', DEMO_INVESTOR_ID)
    .eq('offering_id', offeringId)
    .maybeSingle();

  // 4. Fetch On-Chain Confirmed ATS Balance (fails closed, never returns fake 0)
  const walletAddress = profile?.wallet_address || '0x27db461757dc16461f3b5323118cb53e03e21d3f';
  const assetTarget = offering?.token_contract_id || offering?.token_evm_address || '0.0.11330441';

  const chainBalanceResult = await readHolderBalance(walletAddress, assetTarget);
  const isConfirmed = chainBalanceResult.status === 'CONFIRMED';
  const confirmedUnits = isConfirmed && chainBalanceResult.data !== null
    ? chainBalanceResult.data.toString()
    : '0';
  const lastSyncAt = chainBalanceResult.lastSyncAt;
  const isStale = chainBalanceResult.status === 'UNAVAILABLE';

  // 5. Fetch Investor Orders
  const { data: allOrders } = await admin
    .from('investment_orders')
    .select('*')
    .eq('investor_id', DEMO_INVESTOR_ID)
    .order('created_at', { ascending: false });

  const orders = allOrders || [];

  // Separate pending vs settled orders (UI §8.5: pending shown separately from confirmed)
  const pendingOrders = orders.filter((o) =>
    [
      'UNITS_RESERVED',
      'PAYMENT_PENDING',
      'PAYMENT_CONFIRMED',
      'ALLOCATION_PENDING',
      'ALLOCATION_SUBMITTED',
      'ALLOCATION_CONFIRMED',
    ].includes(o.status)
  );

  const completedOrSettledOrders = orders.filter(
    (o) =>
      ![
        'UNITS_RESERVED',
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMED',
        'ALLOCATION_PENDING',
        'ALLOCATION_SUBMITTED',
        'ALLOCATION_CONFIRMED',
      ].includes(o.status)
  );

  const pendingUnitsCount = pendingOrders.reduce(
    (sum, o) => sum + BigInt(o.units || '0'),
    0n
  );

  const isWalletVerified = Boolean(profile?.wallet_verified_at);
  const isKycEligible = eligibility?.status === 'eligible';
  const isChainRegistered = eligibility?.chain_status === 'registered';

  return (
    <AppShell initialRole="investor">
      <PageContainer maxWidth="7xl">
        <div className="space-y-6 pb-12" data-testid="investor-dashboard">
          {/* Breadcrumb Navigation */}
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Investor Dashboard' },
            ]}
          />

          {/* Top Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                  Investor: {profile?.full_name || 'Rahul Mehta'}
                </span>
                <Badge variant="info" className="text-[10px] font-mono uppercase">
                  SIMULATED DEMO
                </Badge>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">
                Investor Dashboard
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Demo portfolio state, wallet binding status, chain-confirmed ATS holdings, and settlement orders.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/investor/wallet">
                <Button variant="outline" className="text-xs flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Wallet &amp; Eligibility</span>
                </Button>
              </Link>
              <Link href={`/offerings/${offeringId}`}>
                <Button variant="primary" className="text-xs flex items-center gap-1.5">
                  <span>Explore Demo Offering</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Rules: UI §8.5 constraints strictly enforced */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Chain-Confirmed Holdings Card */}
            <div
              className="bg-surface-card border border-border rounded-lg p-4 space-y-2 shadow-sm"
              data-testid="holdings-kpi-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">
                  Chain-Confirmed Holdings
                </span>
                <Badge variant={isStale ? 'warning' : 'success'} className="text-[10px]">
                  {isStale ? 'Pending Sync' : 'Confirmed'}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-text-primary">
                  {confirmedUnits}
                </span>
                <span className="text-xs font-mono text-text-secondary">units</span>
              </div>
              <div className="text-[11px] text-text-secondary space-y-0.5 border-t border-border pt-1.5">
                <div className="truncate">
                  Source: <span className="font-mono">Hedera Testnet (296)</span>
                </div>
                <div className="truncate font-mono text-[10px]">
                  Sync: {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </div>

            {/* 2. Pending Orders Card */}
            <div
              className="bg-surface-card border border-border rounded-lg p-4 space-y-2 shadow-sm"
              data-testid="pending-orders-kpi-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">
                  Pending Orders (Separate)
                </span>
                <Badge variant="warning" className="text-[10px]">
                  {pendingOrders.length} In Flight
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-text-primary">
                  {pendingUnitsCount.toString()}
                </span>
                <span className="text-xs font-mono text-text-secondary">units reserved</span>
              </div>
              <p className="text-[11px] text-text-secondary border-t border-border pt-1.5">
                Shown separately from confirmed holdings until settlement completes.
              </p>
            </div>

            {/* 3. Demo Wallet Status Card */}
            <div
              className="bg-surface-card border border-border rounded-lg p-4 space-y-2 shadow-sm"
              data-testid="wallet-status-kpi-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">
                  Demo Wallet Status
                </span>
                <Badge variant={isWalletVerified ? 'success' : 'neutral'} className="text-[10px]">
                  {isWalletVerified ? 'Verified' : 'Not Connected'}
                </Badge>
              </div>
              <div className="font-mono text-xs text-text-primary truncate" title={walletAddress}>
                {walletAddress.slice(0, 10)}...{walletAddress.slice(-8)}
              </div>
              <p className="text-[11px] text-text-secondary border-t border-border pt-1.5">
                {isWalletVerified
                  ? 'Bound via EIP-191 personal sign'
                  : 'Connect demo testnet wallet to participate'}
              </p>
            </div>

            {/* 4. Eligibility & ATS Registration Card */}
            <div
              className="bg-surface-card border border-border rounded-lg p-4 space-y-2 shadow-sm"
              data-testid="eligibility-kpi-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-secondary">
                  Eligibility &amp; ATS KYC
                </span>
                <Badge
                  variant={isKycEligible && isChainRegistered ? 'success' : 'warning'}
                  className="text-[10px]"
                >
                  {isChainRegistered ? 'Registered' : 'Review Needed'}
                </Badge>
              </div>
              <div className="text-xs font-semibold text-text-primary">
                {isKycEligible ? 'Eligible for Demo Offering' : 'Pending Verification'}
              </div>
              <p className="text-[11px] text-text-secondary border-t border-border pt-1.5">
                {isChainRegistered
                  ? 'Mirrored to ATS KycFacet on chain'
                  : 'Requires KYC verification sync'}
              </p>
            </div>
          </div>

          {/* Holdings Summary & Asset Details */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" />
                  <span>Chain-Confirmed Asset Holdings</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Balances read directly from the Hedera ATS Diamond contract via Mirror Node.
                </p>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                Ledger: ERC-1400 / ATS Diamond
              </span>
            </div>

            <div className="p-4 rounded-lg bg-surface-muted border border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-text-primary">
                    {offering?.token_name || 'NIVASA Commercial 001'}
                  </span>
                  <Badge variant="neutral" className="font-mono text-[10px]">
                    {offering?.token_symbol || 'PROPERTY-MH-001'}
                  </Badge>
                </div>
                <div className="text-xs text-text-secondary font-mono flex flex-wrap gap-x-4 gap-y-1">
                  <span>ATS Contract: {offering?.token_contract_id || '0.0.11330441'}</span>
                  <span>Chain ID: 296</span>
                  <span>Unit Price: ₹{offering?.unit_price_inr || '10,000'}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-[11px] text-text-secondary block">Confirmed Units</span>
                  <span className="text-xl font-bold font-mono text-brand-primary">
                    {confirmedUnits}
                  </span>
                </div>

                {offering?.token_contract_id && (
                  <a
                    href={`https://hashscan.io/testnet/contract/${offering.token_contract_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded border border-border hover:bg-surface-card text-text-secondary hover:text-text-primary text-xs flex items-center gap-1"
                    title="View ATS Diamond on HashScan"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            <p className="text-[11px] text-text-secondary italic">
              *Holdings reflect reconciled, on-chain balances only. If you recently placed an order,
              check the pending orders section below for live settlement progress.
            </p>
          </div>

          {/* Pending Orders Section (Listed Separately) */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Clock className="w-4 h-4 text-status-warning" />
                  <span>Pending Settlement Orders</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Orders currently undergoing simulated payment or Hedera allocation worker processing.
                </p>
              </div>
              <Badge variant="warning" className="text-xs">
                {pendingOrders.length} Active
              </Badge>
            </div>

            {pendingOrders.length === 0 ? (
              <div
                className="p-6 rounded-lg bg-surface-muted border border-border text-center text-xs text-text-secondary space-y-2"
                data-testid="no-pending-orders"
              >
                <p>No pending settlement orders in progress.</p>
                <p className="text-[11px]">
                  When you reserve units, settlement progress will be tracked here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary font-medium">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Unit Price</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Settlement State</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {pendingOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-surface-muted/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-text-primary">
                          {order.id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-3 text-text-primary">{order.units}</td>
                        <td className="py-3 px-3">₹{order.unit_price_inr}</td>
                        <td className="py-3 px-3 font-semibold text-text-primary">
                          {formatINR(order.amount_inr)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="warning" className="text-[10px]">
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-text-secondary text-[11px]">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-3 text-right font-sans">
                          <Link href={`/investor/orders/${order.id}`}>
                            <Button variant="outline" className="text-[11px] py-1 px-2.5">
                              Settlement Timeline ↗
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Settled Orders & History */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-primary" />
                  <span>Settled Orders &amp; Audit History</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Historical orders that have reached terminal states (COMPLETED, REFUNDED, or MANUAL_REVIEW).
                </p>
              </div>
              <span className="text-xs font-mono text-text-secondary">
                {completedOrSettledOrders.length} Settled
              </span>
            </div>

            {completedOrSettledOrders.length === 0 ? (
              <div
                className="p-6 rounded-lg bg-surface-muted border border-border text-center text-xs text-text-secondary"
                data-testid="no-settled-orders"
              >
                No completed or historical settlement records yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border text-text-secondary font-medium">
                      <th className="py-2.5 px-3">Order ID</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Total Paid</th>
                      <th className="py-2.5 px-3">Final Status</th>
                      <th className="py-2.5 px-3">Settlement Date</th>
                      <th className="py-2.5 px-3">Verification Receipt</th>
                      <th className="py-2.5 px-3 text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {completedOrSettledOrders.map((order) => {
                      const isCompleted = order.status === 'COMPLETED';
                      return (
                        <tr key={order.id} className="hover:bg-surface-muted/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-text-primary">
                            {order.id.slice(0, 8)}...
                          </td>
                          <td className="py-3 px-3 text-text-primary">{order.units}</td>
                          <td className="py-3 px-3 font-semibold text-text-primary">
                            {formatINR(order.amount_inr)}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={isCompleted ? 'success' : 'danger'}
                              className="text-[10px]"
                            >
                              {order.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-text-secondary text-[11px]">
                            {new Date(order.updated_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-3 font-sans">
                            {isCompleted && order.receipt_token ? (
                              <Link
                                href={`/verify/receipt/${order.receipt_token}`}
                                className="text-brand-primary hover:underline flex items-center gap-1 text-[11px] font-medium"
                              >
                                <span>View Receipt</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            ) : (
                              <span className="text-text-secondary text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-sans">
                            <Link href={`/investor/orders/${order.id}`}>
                              <Button variant="outline" className="text-[11px] py-1 px-2.5">
                                Inspect ↗
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Property Intelligence & Commercial Facts Preview */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
                  <Building className="w-4 h-4 text-brand-primary" />
                  <span>Property Intelligence Preview (Snapshot #1 Baseline)</span>
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  Deterministic metrics and baseline commercial snapshot tied to Godrej Platina Wing A.
                </p>
              </div>
              <Badge variant="info" className="text-xs">
                Simulated Provenance
              </Badge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block">Simulated Valuation</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block">
                  ₹10,00,00,000
                </span>
                <span className="text-[10px] text-text-secondary">Ref: Val-Report-2026</span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block">Annual Rent</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block">
                  ₹72,00,000
                </span>
                <span className="text-[10px] text-text-secondary">Provenance: Lease-Agr-2026</span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block">Occupancy Rate</span>
                <span className="text-sm font-semibold text-text-primary mt-0.5 block">
                  90.0%
                </span>
                <span className="text-[10px] text-text-secondary">Baseline Snapshot #1</span>
              </div>

              <div className="p-3 rounded bg-surface-muted border border-border">
                <span className="text-[11px] text-text-secondary block">Gross Yield (Formula)</span>
                <span className="text-sm font-semibold text-brand-primary mt-0.5 block">
                  7.20%
                </span>
                <span className="text-[10px] text-text-secondary">Rent ÷ Valuation</span>
              </div>
            </div>

            <p className="text-[11px] text-text-secondary italic">
              *Gross yield is derived strictly as Rent ÷ Valuation (7.20%). Gross only, not net yield, and does not represent a financial forecast or guaranteed return.
            </p>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
