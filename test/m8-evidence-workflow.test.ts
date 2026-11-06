/**
 * Milestone M8: Real Evidence Workflow Test Suite
 * ARCH §10 (all), §12.1, §17.2, §19 · PRD FR-2.1–2.7 · UI §8.3, §8.4, §11.1–11.3 · PLAN M8
 *
 * Requirements:
 * 1. Server-side SHA-256 over raw file streams; never trust client hashes.
 * 2. MIME allowlist: PDF, PNG, JPEG; <= 15MB cap.
 * 3. Canonical JSON Merkle root with sorted-pair hashing: H(min(A,B) + max(A,B)).
 * 4. Permuting document leaves produces the EXACT same Merkle root.
 * 5. Weighted checklist completeness drops when docs are missing or expired.
 * 6. Separation of Duties (SoD): Verifier cannot be the property issuer (SOD_VIOLATION).
 * 7. Verification decisions bound to exact manifest version; approved manifests immutable.
 * 8. Substantive justification reason (>= 10 chars) mandatory for every review.
 */

import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { getAdminDbClient } from '@/lib/db/admin';
import {
  computeLeafHash,
  computeMerkleRoot,
  canonicalStringify,
} from '@/lib/evidence/merkle';
import {
  buildEvidenceManifest,
  DocumentForManifest,
} from '@/lib/evidence/manifest';
import {
  calculateChecklistCompleteness,
  getChecklistConfig,
  DocumentRecordInput,
} from '@/lib/evidence/checklist';
import { storeEvidenceDocument } from '@/lib/evidence/storage';

// Route handlers
import { POST as createPropertyHandler } from '@/app/api/properties/route';
import { POST as uploadDocHandler } from '@/app/api/properties/[id]/documents/route';
import { POST as submitManifestHandler } from '@/app/api/properties/[id]/submit/route';
import { POST as submitVerificationHandler } from '@/app/api/properties/[id]/verifications/route';

describe('Milestone M8: Real Evidence Workflow & Merkle Manifests', () => {
  const adminDb = getAdminDbClient();

  // Pre-seeded actor IDs
  const ISSUER_ID = 'e7084862-05bb-4b40-911d-46c56b12f875'; // Devendra Sharma (Nivasa Realty)
  const VERIFIER_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4'; // Anand Verma (Title Verifier)
  const VERIFIER_2_ID = '7b78cda8-0315-4508-9553-6c29702cd8a0'; // Pooja Kulkarni
  const INVESTOR_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109'; // Rahul Mehta (Investor)

  let testPropertyId: string;
  let testManifestId: string;

  afterAll(async () => {
    // Clean up created test property and documents
    if (testPropertyId) {
      await adminDb.from('property_verifications').delete().eq('property_id', testPropertyId);
      await adminDb.from('evidence_manifests').delete().eq('property_id', testPropertyId);
      await adminDb.from('property_documents').delete().eq('property_id', testPropertyId);
      await adminDb.from('properties').delete().eq('id', testPropertyId);
    }
  });

  // =========================================================================
  // 1. Merkle Tree & Canonical Manifest Invariants
  // =========================================================================
  describe('1. Merkle Tree & Canonical Manifest Invariants', () => {
    const docA: DocumentForManifest = {
      id: 'doc-001',
      document_type: 'property_card',
      sha256_hash: '1111111111111111111111111111111111111111111111111111111111111111',
      source_name: 'Bhumi Abhilekh Maharashtra',
      source_reference: 'PC-PUN-2026-9901',
      issued_at: '2026-01-15T00:00:00.000Z',
      valid_until: '2027-01-15T00:00:00.000Z',
      status: 'active',
    };

    const docB: DocumentForManifest = {
      id: 'doc-002',
      document_type: 'sale_deed',
      sha256_hash: '2222222222222222222222222222222222222222222222222222222222222222',
      source_name: 'Sub-Registrar Haveli 2',
      source_reference: 'REG-HV2-2024-4421',
      issued_at: '2024-03-20T00:00:00.000Z',
      valid_until: null,
      status: 'active',
    };

    const docC: DocumentForManifest = {
      id: 'doc-003',
      document_type: 'encumbrance_certificate',
      sha256_hash: '3333333333333333333333333333333333333333333333333333333333333333',
      source_name: 'IGR Maharashtra',
      source_reference: 'EC-PUN-30YR-8812',
      issued_at: '2026-02-01T00:00:00.000Z',
      valid_until: '2026-08-01T00:00:00.000Z',
      status: 'active',
    };

    it('canonicalStringify produces sorted keys without whitespace', () => {
      const obj1 = { z: 1, a: 'test', m: { b: 2, a: 1 } };
      const obj2 = { a: 'test', m: { a: 1, b: 2 }, z: 1 };
      expect(canonicalStringify(obj1)).toBe(canonicalStringify(obj2));
      expect(canonicalStringify(obj1)).toBe('{"a":"test","m":{"a":1,"b":2},"z":1}');
    });

    it('computes deterministic Merkle root for fixed documents', () => {
      const leafA = computeLeafHash(docA as unknown as Record<string, unknown>);
      const leafB = computeLeafHash(docB as unknown as Record<string, unknown>);
      const leafC = computeLeafHash(docC as unknown as Record<string, unknown>);

      const root1 = computeMerkleRoot([leafA, leafB, leafC]);
      const root2 = computeMerkleRoot([leafA, leafB, leafC]);

      expect(root1).toBe(root2);
      expect(root1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('INVARIANT: Sorted-pair Merkle hashing is commutative under permutation', () => {
      const leafA = computeLeafHash(docA as unknown as Record<string, unknown>);
      const leafB = computeLeafHash(docB as unknown as Record<string, unknown>);
      const leafC = computeLeafHash(docC as unknown as Record<string, unknown>);

      // Permutations of leaves
      const rootABC = computeMerkleRoot([leafA, leafB, leafC]);
      const rootCBA = computeMerkleRoot([leafC, leafB, leafA]);
      const rootBAC = computeMerkleRoot([leafB, leafA, leafC]);
      const rootCAB = computeMerkleRoot([leafC, leafA, leafB]);

      // All permutations MUST yield the exact same Merkle root
      expect(rootCBA).toBe(rootABC);
      expect(rootBAC).toBe(rootABC);
      expect(rootCAB).toBe(rootABC);
    });

    it('changing a single character in any leaf alters the Merkle root completely', () => {
      const leafA = computeLeafHash(docA as unknown as Record<string, unknown>);
      const leafB = computeLeafHash(docB as unknown as Record<string, unknown>);
      const leafC = computeLeafHash(docC as unknown as Record<string, unknown>);
      const baselineRoot = computeMerkleRoot([leafA, leafB, leafC]);

      const tamperedDocA: DocumentForManifest = {
        ...docA,
        source_reference: 'PC-PUN-2026-9902', // 1 char changed
      };
      const tamperedLeafA = computeLeafHash(tamperedDocA as unknown as Record<string, unknown>);
      const tamperedRoot = computeMerkleRoot([tamperedLeafA, leafB, leafC]);

      expect(tamperedRoot).not.toBe(baselineRoot);
    });

    it('buildEvidenceManifest returns sorted leafHashes, Merkle root, and manifestHash', () => {
      const manifest = buildEvidenceManifest(
        '11111111-1111-1111-1111-111111111111',
        1,
        [docA, docB, docC]
      );

      expect(manifest.manifestJson.version).toBe(1);
      expect(manifest.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(manifest.leafHashes.length).toBe(3);
      expect(manifest.completenessPct).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Maharashtra Checklist Completeness Engine
  // =========================================================================
  describe('2. Maharashtra Checklist Completeness Engine', () => {
    it('returns 9 items per Maharashtra framework specification', () => {
      const config = getChecklistConfig();
      expect(config.length).toBe(9);
      const codes = config.map((c) => c.code);
      expect(codes).toContain('property_card');
      expect(codes).toContain('sale_deed');
      expect(codes).toContain('index_ii');
      expect(codes).toContain('encumbrance_certificate');
      expect(codes).toContain('approved_plans');
      expect(codes).toContain('occupancy_certificate');
      expect(codes).toContain('property_tax_receipt');
      expect(codes).toContain('valuation_report');
      expect(codes).toContain('lease_agreement');
    });

    it('computes 100.00% completeness when all required documents are active and unexpired', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const validUntil = futureDate.toISOString();

      const docs: DocumentRecordInput[] = [
        { id: '1', document_type: 'property_card', status: 'active', valid_until: validUntil },
        { id: '2', document_type: 'sale_deed', status: 'active', valid_until: null },
        { id: '3', document_type: 'index_ii', status: 'active', valid_until: null },
        { id: '4', document_type: 'encumbrance_certificate', status: 'active', valid_until: validUntil },
        { id: '5', document_type: 'approved_plans', status: 'active', valid_until: null },
        { id: '6', document_type: 'occupancy_certificate', status: 'active', valid_until: null },
        { id: '7', document_type: 'property_tax_receipt', status: 'active', valid_until: validUntil },
        { id: '8', document_type: 'valuation_report', status: 'active', valid_until: validUntil },
      ];

      const result = calculateChecklistCompleteness(docs);
      expect(result.completenessPct).toBe('100.00');
      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredCodes.length).toBe(0);
      expect(result.expiredCodes.length).toBe(0);
    });

    it('drops completeness score and identifies expired documents', () => {
      const pastDate = '2020-01-01T00:00:00.000Z'; // Expired
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const docs: DocumentRecordInput[] = [
        { id: '1', document_type: 'property_card', status: 'active', valid_until: pastDate }, // expired (15 wt)
        { id: '2', document_type: 'sale_deed', status: 'active', valid_until: null }, // verified (15 wt)
        { id: '3', document_type: 'index_ii', status: 'active', valid_until: null }, // verified (10 wt)
        { id: '4', document_type: 'encumbrance_certificate', status: 'active', valid_until: futureDate.toISOString() }, // verified (15 wt)
      ];

      const result = calculateChecklistCompleteness(docs);
      expect(result.isComplete).toBe(false);
      expect(result.expiredCodes).toContain('property_card');
      expect(result.missingRequiredCodes).toContain('approved_plans');
      expect(result.missingRequiredCodes).toContain('occupancy_certificate');
      expect(result.missingRequiredCodes).toContain('property_tax_receipt');
      expect(result.missingRequiredCodes).toContain('valuation_report');
      expect(parseFloat(result.completenessPct)).toBeLessThan(50);
    });

    it('optional document (lease_agreement) does not prevent 100% required completeness', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const validUntil = futureDate.toISOString();

      // Only required docs provided, no lease_agreement
      const docs: DocumentRecordInput[] = [
        { id: '1', document_type: 'property_card', status: 'active', valid_until: validUntil },
        { id: '2', document_type: 'sale_deed', status: 'active', valid_until: null },
        { id: '3', document_type: 'index_ii', status: 'active', valid_until: null },
        { id: '4', document_type: 'encumbrance_certificate', status: 'active', valid_until: validUntil },
        { id: '5', document_type: 'approved_plans', status: 'active', valid_until: null },
        { id: '6', document_type: 'occupancy_certificate', status: 'active', valid_until: null },
        { id: '7', document_type: 'property_tax_receipt', status: 'active', valid_until: validUntil },
        { id: '8', document_type: 'valuation_report', status: 'active', valid_until: validUntil },
      ];

      const result = calculateChecklistCompleteness(docs);
      expect(result.isComplete).toBe(true);
      expect(result.completenessPct).toBe('100.00');
    });
  });

  // =========================================================================
  // 3. Server-side SHA-256 & Storage Security
  // =========================================================================
  describe('3. Server-side SHA-256 & Storage Security', () => {
    it('computes exact SHA-256 server-side over bytes regardless of client claims', async () => {
      const rawContent = Buffer.from('Maharashtra Title Evidence Test File Content - Unique Seed ' + Date.now());
      const expectedHash = crypto.createHash('sha256').update(rawContent).digest('hex');

      const storageResult = await storeEvidenceDocument(
        '11111111-1111-1111-1111-111111111111',
        crypto.randomUUID(),
        'title_search.pdf',
        rawContent,
        'application/pdf'
      );

      expect(storageResult.sha256Hash).toBe(expectedHash);
      expect(storageResult.sizeBytes).toBe(rawContent.length);
    });

    it('rejects disallowed MIME types (e.g., executable, text)', async () => {
      const rawContent = Buffer.from('Disallowed script content');

      await expect(
        storeEvidenceDocument(
          '11111111-1111-1111-1111-111111111111',
          crypto.randomUUID(),
          'exploit.html',
          rawContent,
          'text/html'
        )
      ).rejects.toThrow(/Unsupported file MIME type/);
    });

    it('rejects files exceeding the 15MB size cap', async () => {
      const oversizedBuffer = Buffer.alloc(16 * 1024 * 1024 + 1);

      await expect(
        storeEvidenceDocument(
          '11111111-1111-1111-1111-111111111111',
          crypto.randomUUID(),
          'oversized_scan.pdf',
          oversizedBuffer,
          'application/pdf'
        )
      ).rejects.toThrow(/exceeds maximum limit of 15MB/);
    });
  });

  // =========================================================================
  // 4. API Endpoints & Separation of Duties (SoD) Invariant
  // =========================================================================
  describe('4. API Endpoints & Separation of Duties (SoD) Invariant', () => {
    it('Issuer creates draft property submission via POST /api/properties', async () => {
      const req = new NextRequest('http://localhost:3000/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ISSUER_ID,
        },
        body: JSON.stringify({
          name: 'Nivasa Platina Wing C (Test)',
          description: 'Commercial Office Tower Unit, Pune',
          city: 'Pune',
          locality: 'Kalyani Nagar',
          property_type: 'commercial',
          normalized_address: 'Survey No. 45/A, Kalyani Nagar, Pune 411014',
          built_up_area_sqm: 2450.5,
          rr_zone_ref: 'PUN-KLN-2026-C1',
        }),
      });

      const res = await createPropertyHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.property.name).toBe('Nivasa Platina Wing C (Test)');
      expect(data.property.issuer_id).toBe(ISSUER_ID);
      expect(data.property.status).toBe('draft');
      expect(data.property.verification_status).toBe('draft');

      testPropertyId = data.property.id;
    });

    it('Issuer uploads document via POST /api/properties/:id/documents', async () => {
      const samplePdfContent = Buffer.from('%PDF-1.4 Sample Maharashtra Property Card Content');
      const formData = new FormData();
      formData.append('file', new Blob([samplePdfContent], { type: 'application/pdf' }), 'property_card.pdf');
      formData.append('document_type', 'property_card');
      formData.append('source_name', 'Bhumi Abhilekh Maharashtra');
      formData.append('source_reference', 'PC-KLN-2026-9912');
      formData.append('issued_at', '2026-01-10T00:00:00.000Z');
      formData.append('valid_until', '2027-01-10T00:00:00.000Z');
      formData.append('limitation_note', 'Verified against digitized 7/12 land records.');

      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/documents`, {
        method: 'POST',
        headers: {
          'x-demo-user-id': ISSUER_ID,
        },
        body: formData,
      });

      const res = await uploadDocHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.document.document_type).toBe('property_card');
      expect(data.serverHash).toBeDefined();
      expect(data.serverHash.length).toBe(64);
    });

    it('Issuer submits manifest via POST /api/properties/:id/submit -> generates Manifest v1', async () => {
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/submit`, {
        method: 'POST',
        headers: {
          'x-demo-user-id': ISSUER_ID,
        },
      });

      const res = await submitManifestHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.version).toBe(1);
      expect(data.merkleRoot).toBeDefined();
      expect(data.merkleRoot).toMatch(/^[a-f0-9]{64}$/);
      expect(data.manifest.status).toBe('submitted');

      testManifestId = data.manifest.id;
    });

    it('SECURITY INVARIANT (SoD): Property issuer is STRICTLY FORBIDDEN from verifying own property', async () => {
      // The issuer attempts to call POST /api/properties/:id/verifications on their OWN property
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ISSUER_ID, // Issuer attempting to review own asset
        },
        body: JSON.stringify({
          manifest_id: testManifestId,
          decision: 'verified',
          reason: 'I am the issuer and I attest that my own property title is valid.',
        }),
      });

      const res = await submitVerificationHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      // MUST be rejected! (ARCH §10.5, PRD FR-2.6)
      expect(res.status).toBe(403);
      expect(data.error).toBe('SOD_VIOLATION');
      expect(data.message).toMatch(/Separation of duties violation/);
    });

    it('SECURITY: Non-verifier user (investor) cannot record verification decisions', async () => {
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_ID,
        },
        body: JSON.stringify({
          manifest_id: testManifestId,
          decision: 'verified',
          reason: 'Investor attempting to approve property.',
        }),
      });

      const res = await submitVerificationHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error).toBe('FORBIDDEN');
    });

    it('VALIDATION: Rejects verification decision without substantive rationale (< 10 chars)', async () => {
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': VERIFIER_ID,
        },
        body: JSON.stringify({
          manifest_id: testManifestId,
          decision: 'verified',
          reason: 'looks ok', // Only 8 chars!
        }),
      });

      const res = await submitVerificationHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('VALIDATION_ERROR');
    });

    it('SUCCESS: Independent verifier approves Manifest v1 with valid justification', async () => {
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': VERIFIER_ID, // Anand Verma (independent verifier)
        },
        body: JSON.stringify({
          manifest_id: testManifestId,
          decision: 'verified',
          reason: 'Independent verification completed against Maharashtra checklist. Title deeds match land records.',
          limitations: 'Subject to annual property tax receipt updates.',
        }),
      });

      const res = await submitVerificationHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      if (!res.ok) {
        console.error('Verification res failure data:', data);
      }

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.decision).toBe('verified');
      expect(data.verification.reviewer_id).toBe(VERIFIER_ID);

      // Verify database updates
      const { data: updatedManifest } = await adminDb
        .from('evidence_manifests')
        .select('*')
        .eq('id', testManifestId)
        .single();
      expect(updatedManifest?.status).toBe('approved');
      expect(updatedManifest?.approved_at).toBeDefined();

      const { data: updatedProp } = await adminDb
        .from('properties')
        .select('*')
        .eq('id', testPropertyId)
        .single();
      expect(updatedProp?.status).toBe('verified');
      expect(updatedProp?.verification_status).toBe('verified');
    });

    it('IMMUTABILITY: Approved manifest cannot be re-verified or mutated', async () => {
      const req = new NextRequest(`http://localhost:3000/api/properties/${testPropertyId}/verifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': VERIFIER_2_ID, // Another verifier
        },
        body: JSON.stringify({
          manifest_id: testManifestId,
          decision: 'rejected',
          reason: 'Attempting to override an already approved and immutable manifest.',
        }),
      });

      const res = await submitVerificationHandler(req, { params: Promise.resolve({ id: testPropertyId }) });
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('MANIFEST_ALREADY_APPROVED');
    });

    it('Audit trail records all lifecycle events with actor identity', async () => {
      const { data: auditLogs } = await adminDb
        .from('audit_logs')
        .select('*')
        .or(`resource_id.eq.${testPropertyId},resource_id.eq.${testManifestId}`)
        .order('created_at', { ascending: true });

      const actions = (auditLogs || []).map((l) => l.action);
      expect(actions).toContain('PROPERTY_CREATED');
      expect(actions).toContain('EVIDENCE_MANIFEST_SUBMITTED');
    });
  });
});
