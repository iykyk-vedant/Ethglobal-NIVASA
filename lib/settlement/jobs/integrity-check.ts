import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

export interface IntegrityCheckPayload {
  propertyId?: string;
}

export async function processIntegrityCheck(payload: IntegrityCheckPayload = {}) {
  const admin = getAdminDbClient();
  const now = new Date().toISOString();

  // Find target properties
  let query = admin
    .from('evidence_manifests')
    .select('id, property_id, version, manifest_json, merkle_root, status')
    .eq('status', 'approved');

  if (payload.propertyId) {
    query = query.eq('property_id', payload.propertyId);
  }

  const { data: approvedManifests, error: manErr } = await query;
  if (manErr || !approvedManifests || approvedManifests.length === 0) {
    return {
      success: true,
      action: 'no_approved_manifests_to_check',
      checkedCount: 0,
    };
  }

  const results: Array<{
    propertyId: string;
    manifestVersion: number;
    driftDetected: boolean;
    trigger?: string;
    reason?: string;
  }> = [];

  for (const manifest of approvedManifests) {
    const { property_id, version, manifest_json } = manifest;
    const documentsInManifest = (manifest_json as any)?.documents || [];

    // Fetch active documents in database
    const { data: dbDocs } = await admin
      .from('property_documents')
      .select('*')
      .eq('property_id', property_id)
      .eq('status', 'active');

    const dbDocMap = new Map((dbDocs || []).map((d) => [d.document_type.toLowerCase().trim(), d]));
    let driftTrigger: 'T2' | 'T3' | null = null;
    let driftReason: string | null = null;

    // 1. Check T2: Recomputed / current SHA-256 differs from manifest (ARCH §12.1 T2)
    for (const mDoc of documentsInManifest) {
      const docType = (mDoc.document_type || '').toLowerCase().trim();
      const liveDoc = dbDocMap.get(docType);
      if (!liveDoc) {
        driftTrigger = 'T2';
        driftReason = `Document ${mDoc.document_type} present in approved manifest v${version} is missing from active documents`;
        break;
      }
      if (liveDoc.sha256_hash !== mDoc.sha256_hash) {
        driftTrigger = 'T2';
        driftReason = `Document ${mDoc.document_type} SHA-256 hash (${liveDoc.sha256_hash.slice(0, 10)}...) differs from manifest hash (${mDoc.sha256_hash.slice(0, 10)}...)`;
        break;
      }
    }

    // 2. Check T3: Required document past valid_until date (ARCH §12.1 T3)
    if (!driftTrigger) {
      for (const doc of dbDocs || []) {
        if (doc.valid_until && new Date(doc.valid_until).getTime() < Date.now()) {
          driftTrigger = 'T3';
          driftReason = `Required document ${doc.document_type} passed its valid_until date (${doc.valid_until})`;
          break;
        }
      }
    }

    if (driftTrigger) {
      // Enqueue evidence_drift outbox job
      const dedupeKey = `evidence_drift:${property_id}:${driftTrigger}:${version}`;
      await enqueueOutboxJob({
        jobType: 'evidence_drift',
        dedupeKey,
        payload: {
          propertyId: property_id,
          trigger: driftTrigger,
          manifestVersion: version,
          manifestId: manifest.id,
          reason: driftReason,
        },
      });

      results.push({
        propertyId: property_id,
        manifestVersion: version,
        driftDetected: true,
        trigger: driftTrigger,
        reason: driftReason || undefined,
      });
    } else {
      results.push({
        propertyId: property_id,
        manifestVersion: version,
        driftDetected: false,
      });
    }
  }

  await appendAuditLog({
    actorUserId: null,
    actorWallet: 'system:integrity_checker',
    action: 'evidence_integrity_checked',
    resourceType: 'evidence_manifests',
    resourceId: payload.propertyId || 'all_properties',
    reason: `Integrity check executed at ${now}. Evaluated ${approvedManifests.length} manifest(s). Drifts detected: ${results.filter((r) => r.driftDetected).length}.`,
  });

  return {
    success: true,
    checkedCount: approvedManifests.length,
    results,
  };
}

