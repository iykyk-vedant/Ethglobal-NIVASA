import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminDbClient } from '@/lib/db/admin';
import { getHashScanTxUrl } from '@/lib/hedera/config';
import { formatINR } from '@/lib/money/decimal';
import { PageContainer } from '@/components/shell/PageContainer';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Layers,
  FileText,
  Clock,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ReceiptPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicReceiptPage({ params }: ReceiptPageProps) {
  const { token } = await params;
  const admin = getAdminDbClient();

  // 1. Fetch Order by receipt_token
  const { data: order, error: orderErr } = await admin
    .from('investment_orders')
    .select('*')
    .eq('receipt_token', token)
    .single();

  // ARCH §15.3: Only COMPLETED orders expose public receipts
  if (orderErr || !order || order.status !== 'COMPLETED') {
    notFound();
  }

  // 2. Fetch Offering metadata
  const { data: offering } = await admin
    .from('offerings')
    .select('*')
    .eq('id', order.offering_id)
    .single();

  // 3. Fetch Confirmed Allocation Attempt
  const { data: confirmedAttempt } = await admin
    .from('allocation_attempts')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'confirmed')
    .order('attempt_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch Evidence Manifest for Property
  const { data: manifest } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', offering?.property_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hashScanUrl = confirmedAttempt?.chain_tx_id
    ? getHashScanTxUrl(confirmedAttempt.chain_tx_id)
    : null;

  return (
    <PageContainer maxWidth="xl" className="py-8">
      <div className="space-y-6 pb-12" data-testid="public-receipt-page">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Public Verification', href: '/verify' },
            { label: `Receipt ${token.slice(0, 8)}` },
          ]}
        />

        {/* Header Section */}
        <div className="bg-surface-card border border-border rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                  Receipt Token: {token}
                </span>
                <Badge variant="info" className="text-[10px] font-mono uppercase">
                  SIMULATED PROOF
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-text-primary tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-status-success" />
                <span>Proof of Settlement Receipt</span>
              </h1>
              <p className="text-xs text-text-secondary mt-1">
                Cryptographically verifiable record of ATS token unit allocation on Hedera Testnet.
              </p>
            </div>

            <Badge variant="success" className="text-xs px-3 py-1 font-mono uppercase">
              COMPLETED &amp; RECONCILED
            </Badge>
          </div>

          {/* Core Allocation Ledger Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans block">
                Token &amp; Allocation Terms
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Token Name:</span>
                  <span className="text-text-primary font-semibold font-sans">
                    {offering?.token_name || 'NIVASA Commercial 001'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Symbol / Asset Ref:</span>
                  <span className="text-text-primary font-semibold">
                    {offering?.token_symbol || 'PROPERTY-MH-001'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Allocated Units:</span>
                  <span className="text-base font-bold text-brand-primary">
                    {order.units} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Unit Price (INR):</span>
                  <span className="text-text-primary">₹{order.unit_price_inr}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-text-secondary font-sans">Total Paid (Simulated):</span>
                  <span className="text-text-primary font-bold">{formatINR(order.amount_inr)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans block">
                Hedera On-Chain Consensus
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Network:</span>
                  <span className="text-text-primary">Hedera Testnet (Chain ID 296)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">ATS Contract:</span>
                  <span className="text-text-primary">{offering?.token_contract_id || '0.0.11330441'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Holder Wallet:</span>
                  <span className="text-text-primary truncate max-w-[180px]" title={order.ack_wallet}>
                    {order.ack_wallet.slice(0, 8)}...{order.ack_wallet.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Confirmed Attempt:</span>
                  <span className="text-text-primary">Attempt #{confirmedAttempt?.attempt_no || 1}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-text-secondary font-sans">Consensus Timestamp:</span>
                  <span className="text-text-primary text-[10px]">
                    {confirmedAttempt?.confirmed_at || order.updated_at}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real Hedera Explorer Verification Link */}
          {confirmedAttempt?.chain_tx_id && hashScanUrl && (
            <div className="p-4 rounded-lg bg-surface-muted border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-text-primary block">
                  Hedera Consensus Transaction ID
                </span>
                <span className="font-mono text-text-secondary text-[11px] block break-all">
                  {confirmedAttempt.chain_tx_id}
                </span>
              </div>
              <a
                href={hashScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-semibold hover:underline"
              >
                <span>Inspect on HashScan Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Cryptographic Hashes & Document Evidence */}
          <div className="border border-border rounded-lg p-4 bg-surface-muted text-xs space-y-2 font-mono">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans block">
              Cryptographic Integrity Proofs
            </span>
            <div className="space-y-1">
              <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] gap-1">
                <span className="text-text-secondary font-sans">Rights Document Hash (v{order.rights_version}):</span>
                <span className="text-text-primary break-all">{order.rights_document_hash}</span>
              </div>
              {manifest?.merkle_root && (
                <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] gap-1 border-t border-border pt-1">
                  <span className="text-text-secondary font-sans">Evidence Manifest Merkle Root (v{manifest.version}):</span>
                  <span className="text-text-primary break-all">{manifest.merkle_root}</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Settlement Statement (ARCH §15.3) */}
          <div className="text-xs text-text-secondary space-y-1 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-text-primary font-medium">
              <Lock className="w-3.5 h-3.5 text-brand-primary" />
              <span>Privacy &amp; Data Protection</span>
            </p>
            <p className="leading-relaxed">
              This public receipt contains zero personally identifiable information (PII).
              It binds only the cryptographic public address, the versioned rights agreement hash,
              and the immutable consensus transaction ID recorded on the Hedera distributed ledger.
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
