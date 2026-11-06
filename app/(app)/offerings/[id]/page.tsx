import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminDbClient } from '@/lib/db/admin';
import { readTokenSupply, readPauseState } from '@/lib/hedera/chain-reads';
import { formatINR, toMoneyString } from '@/lib/money/decimal';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { OfferingStateBadge } from '@/components/offering/OfferingStateBadge';
import { EvidenceDriftBanner } from '@/components/offering/EvidenceDriftBanner';
import { OfferingUIStateTable } from '@/components/offering/OfferingUIStateTable';
import { ParticipationPanel } from '@/components/offering/ParticipationPanel';
import { DemoOrderForm } from '@/components/offering/DemoOrderForm';
import { ActivationGateChecklist } from '@/components/offering/ActivationGateChecklist';
import { OfferingRightsSection } from '@/components/offering/OfferingRightsSection';
import { AtsAssetSummary } from '@/components/offering/AtsAssetSummary';
import { SupplySummary } from '@/components/offering/SupplySummary';
import { ResumeOfferingButton } from '@/components/offering/ResumeOfferingButton';
import { AppShell } from '@/components/shell/AppShell';
import { Sparkles, ArrowRight } from 'lucide-react';

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
    // PostgREST may decode PostgreSQL numeric as a JS number. Cast the price
    // to text in SQL so decimal helpers never receive a lossy JS Number.
    .select('*, unit_price_inr_text:unit_price_inr::text')
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

  // 3. Fetch Rights Documents
  const { data: allRights = [] } = await admin
    .from('offering_rights')
    .select('*')
    .eq('offering_id', offering.id)
    .order('version', { ascending: false });

  const rights =
    allRights?.find((r) => r.version === offering.current_rights_version) ||
    allRights?.[0] ||
    null;

  const previousRights =
    allRights?.find((r) => r.version === (offering.current_rights_version - 1)) ||
    null;

  // 4. Fetch Evidence Manifest
  const { data: manifest } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', offering.property_id)
    .order('version', { ascending: false })
    .limit(1)
    .single();

  // 5. Fetch on-chain supply & pause state from Hedera ATS contract
  const assetTarget = offering.token_evm_address || offering.token_contract_id;
  const [chainSupplyResult, pauseResult] = await Promise.all([
    readTokenSupply(assetTarget),
    readPauseState(assetTarget),
  ]);

  const chainSupplyNum = chainSupplyResult.status === 'CONFIRMED'
    ? Number(chainSupplyResult.data?.totalUnits ?? 0n)
    : 0;

  const chainSupplyStr = chainSupplyResult.status === 'CONFIRMED'
    ? chainSupplyNum.toString()
    : 'Pending sync';

  // 6. Check demo investor eligibility and wallet status (Rahul Mehta)
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
  const remainingSupply = Math.max(0, totalUnitsInt - chainSupplyNum);

  // 7. Check if new property snapshots exist for Property Intelligence prompt (Task 5: Reason to return)
  const { data: latestSnapshot } = await admin
    .from('property_snapshots')
    .select('snapshot_no, created_at, as_of')
    .eq('property_id', offering.property_id)
    .order('snapshot_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: latestEpisode } = await admin
    .from('ai_episodes')
    .select('snapshot_to, created_at')
    .eq('property_id', offering.property_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasNewSnapshot =
    latestSnapshot &&
    (!latestEpisode || latestSnapshot.snapshot_no > latestEpisode.snapshot_to);

  return (
    <AppShell initialRole="investor">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      <div className="space-y-8 pb-12" data-testid="offering-detail-page">
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
          {(offering.status === 'paused_evidence_drift' || offering.status === 'paused') && (
            <ResumeOfferingButton
              offeringId={offering.id}
              offeringStatus={offering.status}
              manifestVersion={manifest?.version}
              merkleRoot={manifest?.merkle_root}
            />
          )}
          <Link href="/verify">
            <Button variant="outline" className="text-xs">
              Verify Evidence Integrity
            </Button>
          </Link>
        </div>
      </div>

      {/* High-Visibility Evidence Drift Warning Banner */}
      {offering.status === 'paused_evidence_drift' && (
        <EvidenceDriftBanner driftDate={offering.paused_evidence_drift_at || offering.updated_at} />
      )}

      {/* Property Intelligence Update Prompt (Reason to Return - Task 5) */}
      {hasNewSnapshot && (
        <aside
          aria-label="New property snapshot available"
          className="p-4 rounded-xl border border-brand-primary/30 bg-brand-primary/5 flex flex-wrap items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-primary/10 text-brand-primary shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-text-primary">
                New Property Evidence Snapshot Available
              </h4>
              <p className="text-xs text-text-secondary">
                Snapshot #{latestSnapshot?.snapshot_no} was published on{' '}
                {new Date(latestSnapshot?.as_of || '').toLocaleDateString()}. Run verifiable change analysis to see what moved.
              </p>
            </div>
          </div>
          <Link href={`/intelligence/${offering.property_id}`}>
            <Button className="bg-brand-primary text-white hover:bg-brand-primary/90 text-xs flex items-center gap-1.5 shadow-sm">
              Analyze What Changed <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </aside>
      )}

      {/* Main Grid: Left 2 cols (Overview + D1 Gate + Rights), Right 1 col (Chain + Supply + Order) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 items-start gap-6 xl:gap-8">
        {/* Left Column: 2 Spans */}
        <div className="xl:col-span-2 space-y-6">
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

          {/* D1 Activation Gate Checklist (ARCH §11.2) */}
          <ActivationGateChecklist
            offeringId={offering.id}
            currentStatus={offering.status}
            activationChecks={offering.activation_checks}
            rightsVersion={offering.current_rights_version}
            storedRightsHash={rights?.rights_document_hash}
            approvedManifestRoot={manifest?.merkle_root}
          />

          {/* Offering Rights Management & Versioning Section (ARCH §11.1, §11.3) */}
          <OfferingRightsSection
            offeringId={offering.id}
            currentRights={rights}
            previousRights={previousRights}
            allVersions={allRights || []}
            canPropose={true}
          />

          {/* Evidence Verification State */}
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

        {/* Right Column: ATS Asset, Supply, Participation & Order Form */}
        <div className="space-y-6">
          {/* ATS Asset Summary */}
          <AtsAssetSummary
            atsAssetRef={offering.ats_asset_ref || 'PROPERTY-MH-001'}
            tokenContractId={offering.token_contract_id || '0.0.11330441'}
            tokenEvmAddress={offering.token_evm_address || '0x52ed835e649a4b045a21bc5e240623d8a77f73ef'}
            chainId={offering.chain_id || 296}
            isPaused={pauseResult.data ?? false}
            configurationHash={offering.configuration_hash}
            lastSyncAt={pauseResult.lastSyncAt}
          />

          {/* Supply Summary */}
          <SupplySummary
            maxSupply={offering.total_units || '10000'}
            chainConfirmedSupply={chainSupplyStr}
            unitPriceInr={toMoneyString(offering.unit_price_inr_text)}
            lastSyncAt={chainSupplyResult.lastSyncAt}
          />

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
            offeringStatus={offering.status}
            rightsVersion={offering.current_rights_version}
            rightsDocumentHash={rights?.rights_document_hash || ''}
            unitPriceInr={toMoneyString(offering.unit_price_inr_text)}
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
    </div>
    </AppShell>
  );
}
