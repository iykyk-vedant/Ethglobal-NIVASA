import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminDbClient } from '@/lib/db/admin';
import { readTokenSupply } from '@/lib/hedera/chain-reads';
import { getHederaConfig, getHashScanTxUrl } from '@/lib/hedera/config';
import { formatINR, toMoneyString } from '@/lib/money/decimal';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfferingStateBadge } from '@/components/offering/OfferingStateBadge';
import { EvidenceDriftBanner } from '@/components/offering/EvidenceDriftBanner';
import { OfferingUIStateTable } from '@/components/offering/OfferingUIStateTable';
import { ParticipationPanel } from '@/components/offering/ParticipationPanel';
import { DemoOrderForm } from '@/components/offering/DemoOrderForm';

export const dynamic = 'force-dynamic';

interface OfferingPageProps {
  params: Promise<{ id: string }>;
}

export default async function OfferingPage({ params }: OfferingPageProps) {
  const { id } = await params;
  const admin = getAdminDbClient();

  // 1. Fetch Offering
  const { data: offering, error: offeringErr } = await admin
    .from('offerings')
    .select('*')
    .eq('id', id)
    .single();

  if (offeringErr || !offering) {
    notFound();
  }

  // 2. Fetch Associated Property
  const { data: property } = await admin
    .from('properties')
    .select('*')
    .eq('id', offering.property_id)
    .single();

  // 3. Fetch Active Rights Document
  const { data: rights } = await admin
    .from('offering_rights')
    .select('*')
    .eq('offering_id', offering.id)
    .eq('version', offering.current_rights_version)
    .single();

  // 4. Fetch Evidence Manifest
  const { data: manifest } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', offering.property_id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  // 5. Fetch on-chain supply from Hedera Testnet ATS contract
  const chainSupplyResult = await readTokenSupply(offering.token_evm_address || offering.token_contract_id);
  const chainSupplyStr = chainSupplyResult.status === 'CONFIRMED'
    ? chainSupplyResult.data?.totalUnits?.toString() || '0'
    : 'Pending sync';

  // 6. Check demo investor eligibility and wallet status
  // Rahul Mehta (seeded eligible investor)
  const DEMO_INVESTOR_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const { data: investorProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', DEMO_INVESTOR_ID)
    .single();

  const { data: eligibility } = await admin
    .from('investor_eligibility')
    .select('*')
    .eq('user_id', DEMO_INVESTOR_ID)
    .eq('offering_id', offering.id)
    .maybeSingle();

  // Financial calculations
  const totalValuationInr = '100000000.00'; // ₹10,00,00,000 (Simulated valuation provenance)
  const annualRentInr = '7200000.00';       // ₹72,00,000 (Simulated commercial lease provenance)
  const grossYieldPercent = '7.20%';        // Rent ÷ Valuation = 7.20%

  const totalUnitsInt = parseInt(offering.total_units || '10000', 10);
  const remainingSupply = totalUnitsInt; // In demo offering, initial remaining supply

  const config = getHederaConfig();
  const hashScanContractUrl = offering.token_contract_id
    ? `https://hashscan.io/testnet/contract/${offering.token_contract_id}`
    : null;

  return (
    <div className="space-y-6 pb-12" data-testid="offering-detail-page">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Demo offerings', href: '/' },
          { label: offering.token_symbol || 'NIVASA-MH-001' },
        ]}
      />

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
              Asset Ref: {offering.ats_asset_ref || 'PROPERTY-MH-001'}
            </span>
            <Badge variant="info" className="text-[10px] font-mono uppercase">
              SIMULATED DEMO
            </Badge>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            {offering.token_name || 'NIVASA Commercial 001'} ({offering.token_symbol || 'PROPERTY-MH-001'})
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {property?.normalized_address || 'Wing A, Godrej Platina, LBS Marg, Vikhroli West, Mumbai'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <OfferingStateBadge status={offering.status} showTechnicalName />
          <Link href="/verify">
            <Button variant="outline" className="text-xs">
              Verify Evidence Integrity
            </Button>
          </Link>
        </div>
      </div>

      {/* High-Visibility Evidence Drift Warning Banner */}
      {offering.status === 'paused_evidence_drift' && (
        <EvidenceDriftBanner driftDate={offering.updated_at} />
      )}

      {/* Main Grid: Asset Overview & Financial Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 2 Spans (Asset overview + Rights + Evidence) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Asset Overview */}
          <div className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Asset Overview &amp; Commercial Facts
              </h2>
              <span className="text-xs text-[var(--text-secondary)] font-mono">
                Provenance: Simulated Seed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">City &amp; Locality</span>
                <span className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {property?.city}, {property?.locality}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Zone: {property?.rr_zone_ref}</span>
              </div>

              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Property Type</span>
                <span className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {property?.property_type || 'Commercial Office'}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Built-up: {property?.built_up_area_sqm} m²</span>
              </div>

              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Simulated Valuation</span>
                <span className="text-sm font-semibold text-[var(--text-primary)] mt-0.5 block">
                  {formatINR(totalValuationInr)}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Ref: Val-Report-2026</span>
              </div>

              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Gross Yield (Formula)</span>
                <span className="text-sm font-semibold text-[var(--brand-forest)] mt-0.5 block">
                  {grossYieldPercent}
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Gross only, not forecast</span>
              </div>
            </div>

            {/* Yield Formula Explanation */}
            <div className="p-3 rounded bg-[var(--surface-sunken)] text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)] space-y-1">
              <div className="font-medium text-[var(--text-primary)]">Gross Yield Derivation Formula:</div>
              <div className="font-mono text-[11px]">
                Gross Yield = Annual Rent ({formatINR(annualRentInr)}) ÷ Valuation ({formatINR(totalValuationInr)}) = 7.20%
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] italic">
                *Gross only, not net yield, and does not represent a financial forecast or assurance of return.
              </p>
            </div>
          </div>

          {/* Rights Summary Panel */}
          <div className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Demo Rights Summary (v{rights?.version || 1})
              </h2>
              <span className="text-xs font-mono text-[var(--text-secondary)]">
                Hash: {rights?.rights_document_hash?.slice(0, 10)}...{rights?.rights_document_hash?.slice(-8)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--status-success)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--status-success)]" />
                  What This Token Represents
                </span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {rights?.income_entitlement_rule || 'Quarterly proportional rental income distribution.'}
                  Subject exclusively to the terms of the versioned rights document.
                </p>
              </div>

              <div className="p-3.5 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)] space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--status-danger)] flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[var(--status-danger)]" />
                  What This Token Does NOT Represent
                </span>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {rights?.voting_or_control_rights || 'Non-voting fractional economic entitlement.'}
                  Does NOT convey physical land deed, title clearance, or operational control of the property.
                </p>
              </div>
            </div>

            <div className="text-xs text-[var(--text-secondary)] space-y-1 pt-1">
              <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
                <span>Transferability:</span>
                <span className="font-medium text-[var(--text-primary)]">Restricted to KYC-verified wallets on Chain 296</span>
              </div>
              <div className="flex justify-between">
                <span>Liquidity / Redemption:</span>
                <span className="font-medium text-[var(--text-primary)]">10-year liquidity exit window</span>
              </div>
            </div>
          </div>

          {/* Evidence Panel */}
          <div className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Property Evidence &amp; Verification State
              </h2>
              <Badge variant="success" className="text-xs">
                Manifest v{manifest?.version || 1}: Approved
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Completeness Score</span>
                <span className="text-base font-bold text-[var(--text-primary)] mt-0.5 block">
                  {manifest?.checklist_completeness || '100.00'}%
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Checklist completeness — not a title-clearance score.
                </span>
              </div>

              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Separation of Duties</span>
                <span className="text-xs font-semibold text-[var(--status-success)] mt-1 block">
                  Enforced in Postgres
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">
                  Reviewed by independent verifier
                </span>
              </div>

              <div className="p-3 rounded bg-[var(--surface-sunken)] border border-[var(--border-subtle)]">
                <span className="text-[11px] text-[var(--text-secondary)] block">Merkle Root</span>
                <span className="text-[11px] font-mono text-[var(--text-primary)] truncate mt-1 block" title={manifest?.merkle_root}>
                  {manifest?.merkle_root?.slice(0, 12)}...
                </span>
                <span className="text-[10px] text-[var(--text-secondary)]">Anchored on ATS Asset</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Token/Chain Panel, Participation & Order Form */}
        <div className="space-y-6">
          {/* Token / Chain Panel */}
          <div className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-3">
            <h2 className="text-base font-semibold text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-2.5">
              Hedera ATS Token &amp; Chain Panel
            </h2>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] font-sans">Network:</span>
                <span className="text-[var(--text-primary)]">Hedera Testnet (296)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)] font-sans">Asset Ref:</span>
                <span className="text-[var(--text-primary)]">{offering.ats_asset_ref}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-sans">ATS Contract:</span>
                <span className="text-[var(--text-primary)]">
                  {offering.token_contract_id || '0.0.11330441'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-secondary)] font-sans">EVM Address:</span>
                <span className="text-[var(--text-primary)] text-[11px]" title={offering.token_evm_address}>
                  {offering.token_evm_address?.slice(0, 8)}...{offering.token_evm_address?.slice(-6)}
                </span>
              </div>

              <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1">
                <div className="flex justify-between font-sans">
                  <span className="text-[var(--text-secondary)]">Approved Cap:</span>
                  <span className="font-semibold text-[var(--text-primary)]">{offering.total_units} units</span>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-[var(--text-secondary)]">Chain-Confirmed Supply:</span>
                  <span className="font-bold text-[var(--status-success)]">
                    {chainSupplyStr} units
                  </span>
                </div>
                <div className="flex justify-between font-sans">
                  <span className="text-[var(--text-secondary)]">Unit Price (INR):</span>
                  <span className="font-semibold text-[var(--text-primary)]">₹{offering.unit_price_inr}</span>
                </div>
              </div>

              {hashScanContractUrl && (
                <div className="pt-2">
                  <a
                    href={hashScanContractUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--brand-forest)] hover:underline flex items-center gap-1 font-sans font-medium"
                  >
                    <span>View Contract on HashScan Explorer</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Investor Participation Action Panel */}
          <ParticipationPanel
            offeringId={offering.id}
            offeringStatus={offering.status}
            isWalletVerified={Boolean(investorProfile?.wallet_verified_at)}
            walletAddress={investorProfile?.wallet_address}
            eligibilityStatus={eligibility?.status}
            chainStatus={eligibility?.chain_status}
            rightsDocumentSummary={{
              version: rights?.version || 1,
              rightsType: rights?.rights_type || 'Commercial Equity',
              hash: rights?.rights_document_hash || '',
              incomeRule: rights?.income_entitlement_rule || '',
              transferRule: rights?.transfer_rule || '',
              redemptionRule: rights?.redemption_rule || '',
              votingRule: rights?.voting_or_control_rights || '',
              riskDisclosures: rights?.risk_disclosures || '',
            }}
          />

          {/* Simulated Order Form */}
          <DemoOrderForm
            offeringId={offering.id}
            rightsVersion={offering.current_rights_version}
            rightsDocumentHash={rights?.rights_document_hash || ''}
            unitPriceInr={toMoneyString(offering.unit_price_inr)}
            minimumUnits={parseInt(offering.minimum_units || '1', 10)}
            maximumUnitsPerInvestor={parseInt(offering.maximum_units_per_investor || '500', 10)}
            remainingSupply={remainingSupply}
            boundWalletAddress={investorProfile?.wallet_address}
            isEligible={Boolean(
              investorProfile?.wallet_verified_at &&
              eligibility?.status === 'eligible' &&
              eligibility?.chain_status === 'registered' &&
              offering.status === 'active'
            )}
          />
        </div>
      </div>

      {/* Canonical Offering UI-State Table (UI §8.2) */}
      <OfferingUIStateTable currentStatus={offering.status} />
    </div>
  );
}
