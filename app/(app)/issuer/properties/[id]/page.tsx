import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminDbClient } from '@/lib/db/admin';
import { getCurrentUser } from '@/lib/auth/server-session';
import { calculateChecklistCompleteness } from '@/lib/evidence/checklist';
import { IssuerPropertyWorkspace } from '@/components/evidence/IssuerPropertyWorkspace';
import { Badge } from '@/components/ui/Badge';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function IssuerPropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound(); // The issuer layout redirects unauthenticated visitors.
  const adminDb = getAdminDbClient();

  // 1. Fetch Property
  let propertyQuery = adminDb
    .from('properties')
    .select('*')
    .eq('id', id);
  if (!user.roles.includes('admin')) propertyQuery = propertyQuery.eq('issuer_id', user.userId);
  const { data: property, error: propErr } = await propertyQuery.single();

  if (propErr || !property) {
    notFound();
  }

  // 2. Fetch Active Documents
  const { data: documents, error: documentsErr } = await adminDb
    .from('property_documents')
    .select('*')
    .eq('property_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (documentsErr) {
    throw new Error(`Failed to load evidence documents: ${documentsErr.message}`);
  }

  const activeDocs = documents || [];

  // 3. Fetch Evidence Manifests
  const { data: manifests } = await adminDb
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', id)
    .order('version', { ascending: false });

  const manifestList = manifests || [];

  // 4. Calculate Checklist Evaluation
  const checklistEvaluation = calculateChecklistCompleteness(
    activeDocs.map((d) => ({
      id: d.id,
      document_type: d.document_type,
      status: d.status,
      issued_at: d.issued_at,
      valid_until: d.valid_until,
      received_at: d.received_at,
    }))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Link href="/issuer" className="hover:text-[var(--text-primary)] transition-colors">
          Issuer Portal
        </Link>
        <span>/</span>
        <span className="font-mono text-[var(--text-primary)]">{property.name}</span>
      </div>

      {/* Header Banner */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {property.name}
            </h1>
            <Badge
              variant={
                property.verification_status === 'verified'
                  ? 'success'
                  : property.verification_status === 'submitted'
                  ? 'info'
                  : 'neutral'
              }
            >
              {property.verification_status === 'verified'
                ? 'Demo Review Completed'
                : property.verification_status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {property.address_line_1}, {property.locality}, {property.city} · {property.built_up_area_sqm} sqm built-up area
          </p>
          <div className="text-xs font-mono text-[var(--text-secondary)]">
            Asset Identifier: {property.id}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/verifier"
            className="text-xs px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Switch to Verifier Queue &rarr;
          </Link>
        </div>
      </div>

      {/* Main Workspace */}
      <IssuerPropertyWorkspace
        property={property}
        initialDocuments={activeDocs}
        initialManifests={manifestList}
        checklistEvaluation={checklistEvaluation}
        isOwner={true}
      />
    </div>
  );
}
