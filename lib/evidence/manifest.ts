import { computeLeafHash, computeMerkleRoot, canonicalStringify, sha256 } from './merkle';
import { calculateChecklistCompleteness } from './checklist';

export interface DocumentForManifest {
  id: string;
  document_type: string;
  sha256_hash: string;
  source_name?: string | null;
  source_reference?: string | null;
  issued_at?: string | null;
  valid_until?: string | null;
  status: 'active' | 'superseded' | 'disputed' | 'rejected';
  limitation_note?: string | null;
}

export interface ManifestDocumentEntry {
  document_id: string;
  document_type: string;
  sha256_hash: string;
  source_name: string;
  source_reference: string;
  issued_at: string | null;
  valid_until: string | null;
  status: string;
  limitation_note?: string | null;
  leaf_hash: string;
}

export interface EvidenceManifestStructure {
  property_id: string;
  version: number;
  checklist_version: string;
  created_at: string;
  completeness_pct: string;
  documents: ManifestDocumentEntry[];
  merkle_root: string;
}

export interface BuildManifestResult {
  manifestJson: EvidenceManifestStructure;
  manifestHash: string;
  merkleRoot: string;
  leafHashes: string[];
  completenessPct: string;
}

/**
 * Builds a canonical evidence manifest structure with sorted-pair Merkle root (ARCH §10.4).
 * Documents contain hashes and metadata only; never raw document binaries or investor PII.
 */
export function buildEvidenceManifest(
  propertyId: string,
  version: number,
  documents: DocumentForManifest[],
  createdAt: Date = new Date()
): BuildManifestResult {
  // Filter active documents
  const activeDocs = documents.filter((d) => d.status === 'active');

  // Compute completeness
  const completeness = calculateChecklistCompleteness(activeDocs, createdAt);

  // Compute leaf hash for each document
  const manifestEntries: ManifestDocumentEntry[] = activeDocs.map((doc) => {
    const rawLeafObject = {
      document_id: doc.id,
      document_type: doc.document_type.toLowerCase(),
      issued_at: doc.issued_at || null,
      limitation_note: doc.limitation_note || null,
      sha256_hash: doc.sha256_hash.toLowerCase(),
      source_name: doc.source_name || '',
      source_reference: doc.source_reference || '',
      status: doc.status,
      valid_until: doc.valid_until || null,
    };

    const leafHash = computeLeafHash(rawLeafObject);

    return {
      document_id: doc.id,
      document_type: doc.document_type.toLowerCase(),
      sha256_hash: doc.sha256_hash.toLowerCase(),
      source_name: doc.source_name || '',
      source_reference: doc.source_reference || '',
      issued_at: doc.issued_at || null,
      valid_until: doc.valid_until || null,
      status: doc.status,
      limitation_note: doc.limitation_note || null,
      leaf_hash: leafHash,
    };
  });

  const leafHashes = manifestEntries.map((e) => e.leaf_hash);
  const merkleRoot = computeMerkleRoot(leafHashes);

  const manifestJson: EvidenceManifestStructure = {
    property_id: propertyId,
    version,
    checklist_version: '1.0',
    created_at: createdAt.toISOString(),
    completeness_pct: completeness.completenessPct,
    documents: manifestEntries,
    merkle_root: merkleRoot,
  };

  const canonicalManifest = canonicalStringify(manifestJson);
  const manifestHash = sha256(canonicalManifest);

  return {
    manifestJson,
    manifestHash,
    merkleRoot,
    leafHashes,
    completenessPct: completeness.completenessPct,
  };
}
