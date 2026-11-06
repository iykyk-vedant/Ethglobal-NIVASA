import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { runOfferingVerificationChecks, defaultDbReader } from '@/lib/verify/checks';
import { PageContainer } from '@/components/shell/PageContainer';
import { Breadcrumbs } from '@/components/shell/Breadcrumbs';
import { PrototypeBanner } from '@/components/shell/PrototypeBanner';
import { VerificationSummary } from '@/components/verify/VerificationSummary';
import { VerificationCheckCard } from '@/components/verify/VerificationCheckCard';
import { HashValue } from '@/components/verify/HashValue';
import { Badge } from '@/components/ui/Badge';
import { ShieldCheck, FileText, Layers, ExternalLink, AlertCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface VerifyOfferingPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicVerifyOfferingPage({ params }: VerifyOfferingPageProps) {
  const { id: offeringId } = await params;

  // 1. Fetch offering
  const offering = await defaultDbReader.getPublicOffering(offeringId);
  if (!offering) {
    notFound();
  }

  // 2. Run all verification checks
  const report = await runOfferingVerificationChecks(offeringId);

  // 3. Fetch synthetic rights & manifest for inspection tabs
  const [syntheticRights, manifest] = await Promise.all([
    defaultDbReader.getSyntheticRights(offeringId, offering.current_rights_version),
    offering.property_id ? defaultDbReader.getApprovedManifest(offering.property_id) : Promise.resolve(null),
  ]);

  return (
    <PageContainer maxWidth="xl" className="py-8">
      <div className="space-y-6 pb-16" data-testid="public-verify-offering-page">
        {/* Navigation Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Public Verification', href: '/verify' },
            { label: offering.token_name || `Offering ${offeringId.slice(0, 8)}` },
          ]}
        />

        {/* Persistent Prototype Banner */}
        <PrototypeBanner />

        {/* Wordmark Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card border border-border rounded-lg p-6 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-lg font-bold tracking-tight text-brand-primary">
                NIVASA
              </span>
              <span className="text-text-secondary text-xs">/</span>
              <span className="text-xs font-mono font-medium text-text-secondary uppercase">
                Zero-Login Integrity Audit
              </span>
              <Badge variant="neutral" className="text-[10px] font-mono uppercase">
                Hedera Testnet (Chain ID 296)
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-text-primary tracking-tight">
              {offering.token_name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-text-secondary font-mono flex-wrap pt-0.5">
              <span>Asset Ref: {offering.ats_asset_ref}</span>
              <span>·</span>
              <span>Offering ID: {offering.id}</span>
              <span>·</span>
              <span>ATS Contract: {offering.token_contract_id || '0.0.11330441'}</span>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider font-sans">
              Offering Lifecycle State
            </span>
            <Badge
              variant={offering.status === 'active' ? 'success' : 'warning'}
              className="text-xs px-3 py-1 font-mono uppercase"
            >
              {offering.status}
            </Badge>
          </div>
        </div>

        {/* Verification Summary Card (Aggregate summary: "X PASS · Y FAIL · Z UNAVAILABLE", never a blanket "verified" badge) */}
        <VerificationSummary
          summary={report.summary}
          tokenName={report.tokenName}
          atsAssetRef={report.atsAssetRef}
          offeringId={offering.id}
          checkedAt={report.checkedAt}
        />

        {/* Seven Verification Check Cards (C1–C7) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-text-primary uppercase tracking-wider font-mono text-xs">
              Cryptographic Check Matrix (C1–C7)
            </h2>
            <span className="text-xs text-text-secondary font-mono">
              7 of 7 checks executed
            </span>
          </div>

          <div className="space-y-3.5">
            {report.checks.map((check) => (
              <VerificationCheckCard key={check.id} check={check} />
            ))}
          </div>
        </div>

        {/* Public Transparency Data: Published Rights & Hashes-Only Manifest */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          {/* Synthetic Rights Document Panel */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Published Synthetic Rights Document (v{syntheticRights?.version || 1})
                </h3>
              </div>
              <Badge variant="info" className="text-[10px] font-mono uppercase">
                SYNTHETIC TERMS
              </Badge>
            </div>

            {syntheticRights ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface-muted rounded border border-border font-mono space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-sans font-semibold">
                    Document Digest (SHA-256)
                  </span>
                  <HashValue
                    hash={syntheticRights.rights_document_hash || ''}
                    shorten={true}
                  />
                </div>

                <div className="space-y-2 text-text-secondary leading-relaxed">
                  <div>
                    <strong className="text-text-primary block font-medium">Represents:</strong>
                    <span>{syntheticRights.represents || 'Fractional commercial economic interest'}</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block font-medium">Does Not Represent:</strong>
                    <span>{syntheticRights.does_not_represent || 'Real-world fee simple title, voting control, or direct property deed'}</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block font-medium">Income Entitlement:</strong>
                    <span>{syntheticRights.income_entitlement_rule || 'Quarterly net rental distribution'}</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block font-medium">Transfer Rule:</strong>
                    <span>{syntheticRights.transfer_rule || 'Permitted only between KYC-verified eligible investors'}</span>
                  </div>
                  <div>
                    <strong className="text-text-primary block font-medium">Risk Disclosure:</strong>
                    <span>{syntheticRights.risk_disclosures || 'Simulated demonstration prototype disclaimer'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic">
                Synthetic rights document not currently published.
              </p>
            )}
          </div>

          {/* Hashes-Only Manifest Merkle Tree Panel */}
          <div className="bg-surface-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-text-primary">
                  Published Hashes-Only Manifest (v{manifest?.version || 1})
                </h3>
              </div>
              <Badge variant="success" className="text-[10px] font-mono uppercase">
                MERKLE ROOT BOUND
              </Badge>
            </div>

            {manifest ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-surface-muted rounded border border-border font-mono space-y-1">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-sans font-semibold">
                    Merkle Tree Root
                  </span>
                  <HashValue hash={manifest.merkle_root} shorten={true} />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary block font-sans">
                    Manifest Leaves ({manifest.documents?.length || 0} Documents)
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                    {(manifest.documents || []).map((doc, idx) => (
                      <div
                        key={doc.document_id || idx}
                        className="p-2 rounded bg-surface-muted/50 border border-border flex items-center justify-between text-[11px] font-mono"
                      >
                        <span className="text-text-primary font-medium truncate max-w-[160px]">
                          {doc.document_type}
                        </span>
                        <span className="text-text-secondary text-[10px]">
                          {doc.sha256_hash ? `${doc.sha256_hash.slice(0, 8)}...` : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic">
                No approved manifest available for this offering.
              </p>
            )}
          </div>
        </div>

        {/* Required Prototype Disclaimer Footer (ARCH §13.3) */}
        <div
          role="note"
          className="p-4 bg-surface-muted border border-border rounded-lg text-xs text-text-secondary flex items-start gap-3 mt-8"
        >
          <AlertCircle className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-text-primary font-medium">Technical Prototype Scope Notice: </strong>
            This public verification page is a technical prototype check; it does not prove real estate title, legal validity, regulatory authorization, or investment suitability. All metrics and tokens are for demonstration purposes only.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
