import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { verifyPublicReceipt } from '@/lib/verify/receipt';
import { formatINR } from '@/lib/money/decimal';
import { PageContainer } from '@/components/shell/PageContainer';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { PrototypeBanner } from '@/components/shell/PrototypeBanner';
import { HashValue } from '@/components/verify/HashValue';
import { Badge } from '@/components/ui/Badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Lock,
  Layers,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ReceiptPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicReceiptPage({ params }: ReceiptPageProps) {
  const { token } = await params;

  // 1. Verify settlement receipt using verified service (ARCH §13.2, §20)
  const receipt = await verifyPublicReceipt(token);

  if (!receipt) {
    notFound();
  }

  return (
    <PageContainer maxWidth="xl" className="py-8">
      <div className="space-y-6 pb-16" data-testid="public-receipt-page">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Public Verification', href: '/verify' },
            { label: `Receipt ${token.slice(0, 8)}` },
          ]}
        />

        {/* Prototype Banner */}
        <PrototypeBanner />

        {/* Header Section */}
        <div className="bg-surface-card border border-border rounded-lg p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono uppercase tracking-wider text-text-secondary">
                  Receipt Token: {receipt.receiptToken}
                </span>
                <Badge variant="info" className="text-[10px] font-mono uppercase">
                  SIMULATED PROOF
                </Badge>
              </div>
              <h1 className="text-2xl font-bold font-serif text-text-primary tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-status-success" aria-hidden="true" />
                <span>Proof of Settlement Receipt</span>
              </h1>
              <p className="text-xs text-text-secondary mt-1 max-w-2xl leading-relaxed">
                Cryptographically verifiable record of ATS token unit allocation on Hedera Testnet.
              </p>
            </div>

            <Badge variant="success" className="text-xs px-3 py-1 font-mono uppercase">
              COMPLETED &amp; RECONCILED
            </Badge>
          </div>

          {/* Core Allocation Ledger Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Token & Allocation Terms */}
            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans block">
                Token &amp; Allocation Terms
              </span>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Token Name:</span>
                  <span className="text-text-primary font-semibold font-sans">
                    {receipt.tokenName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Symbol / Asset Ref:</span>
                  <span className="text-text-primary font-semibold">
                    {receipt.tokenSymbol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Units Allocated:</span>
                  <span className="text-text-primary font-bold">
                    {receipt.units} units
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Unit Price Snapshot:</span>
                  <span className="text-text-primary">
                    {formatINR(receipt.unitPriceInr)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-text-secondary font-sans font-medium">Total Amount:</span>
                  <span className="text-text-primary font-bold">
                    {formatINR(receipt.totalAmountInr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Hedera Consensus & Bound Address */}
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
                  <span className="text-text-primary">{receipt.tokenContractId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Shortened Wallet:</span>
                  {/* ARCH §13.2: Shortened wallet only (0x1234...abcd); zero name, email, profile PII */}
                  <span
                    data-testid="shortened-wallet"
                    className="text-text-primary font-mono font-semibold"
                  >
                    {receipt.shortenedWallet}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary font-sans">Confirmed Attempt:</span>
                  <span className="text-text-primary">Attempt #{receipt.attemptNo}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1">
                  <span className="text-text-secondary font-sans">Consensus Timestamp:</span>
                  <span className="text-text-primary text-[10px]">
                    {receipt.confirmedAt || receipt.checkedAt}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Verification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Signature Recovery Check */}
            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-primary">
                    EIP-191 Signature Recovery
                  </span>
                </div>
                <Badge
                  variant={receipt.signatureStatus === 'PASS' ? 'success' : 'danger'}
                  className="text-[10px] font-mono uppercase"
                >
                  {receipt.signatureStatus}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {receipt.signatureRecovered
                  ? 'Cryptographic signature verified. Recovers exactly to the bound investor address.'
                  : 'Signature verification failed. Address could not be recovered.'}
              </p>
            </div>

            {/* On-Chain Balance Check */}
            <div className="p-4 rounded-lg bg-surface-muted border border-border space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                  <span className="text-xs font-semibold text-text-primary">
                    On-Chain Balance Verification
                  </span>
                </div>
                <Badge
                  variant={
                    receipt.onChainBalanceStatus === 'PASS'
                      ? 'success'
                      : receipt.onChainBalanceStatus === 'FAIL'
                      ? 'danger'
                      : 'warning'
                  }
                  className="text-[10px] font-mono uppercase"
                >
                  {receipt.onChainBalanceStatus}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                {receipt.onChainBalanceStatus === 'PASS'
                  ? `ATS contract confirms holder balance (${receipt.onChainBalanceUnits ?? receipt.units} units) is ≥ order units (${receipt.units}).`
                  : receipt.onChainBalanceStatus === 'UNAVAILABLE'
                  ? 'Hedera Testnet contract balance read unavailable or timed out.'
                  : 'On-chain holder balance is lower than ordered units.'}
              </p>
            </div>
          </div>

          {/* Allocation Transaction Link */}
          {receipt.allocationTxId && receipt.allocationTxUrl && (
            <div className="p-4 rounded-lg bg-surface-muted border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-text-primary block">
                  Hedera Consensus Transaction ID
                </span>
                <span className="font-mono text-text-secondary text-[11px] block break-all">
                  {receipt.allocationTxId}
                </span>
              </div>
              <a
                href={receipt.allocationTxUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand-primary font-semibold hover:underline"
              >
                <span>Inspect on HashScan Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {/* Signed Rights Terms Hash */}
          <div className="border border-border rounded-lg p-4 bg-surface-muted text-xs space-y-2 font-mono">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary font-sans block">
              Signed Rights Terms Hash (v{receipt.rightsVersion})
            </span>
            <div className="flex flex-col sm:flex-row sm:justify-between text-[11px] gap-1">
              <span className="text-text-secondary font-sans">Rights Document Hash:</span>
              <HashValue hash={receipt.rightsDocumentHash} shorten={true} />
            </div>
          </div>

          {/* Privacy & Anti-Leak Notice (ARCH §20, UI §8.10) */}
          <div
            data-testid="privacy-guarantee"
            className="text-xs text-text-secondary space-y-1 border-t border-border pt-4"
          >
            <p className="flex items-center gap-1.5 text-text-primary font-medium">
              <Lock className="w-3.5 h-3.5 text-brand-primary" aria-hidden="true" />
              <span>Zero-PII Privacy Protection</span>
            </p>
            <p className="leading-relaxed">
              This public receipt contains zero personally identifiable information (PII).
              It displays only a truncated wallet address, verified cryptographic terms, and
              the Hedera distributed ledger consensus record.
            </p>
          </div>
        </div>

        {/* Required Prototype Scope Disclaimer Footer (ARCH §13.3) */}
        <div
          role="note"
          className="p-4 bg-surface-muted border border-border rounded-lg text-xs text-text-secondary flex items-start gap-3 mt-8"
        >
          <AlertCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-text-primary font-medium">Technical Prototype Scope Notice: </strong>
            This public receipt is a technical prototype settlement proof; it does not prove real estate title, legal validity, regulatory authorization, or investment suitability.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
