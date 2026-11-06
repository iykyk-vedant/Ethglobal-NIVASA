import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Ensure .env is populated into process.env
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[k]) {
      process.env[k] = v;
    }
  }
}

// Import admin functions after env is loaded
import { reserveUnitsRpc, appendAuditLog } from '../lib/db/admin';

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

describe('Milestone M2: Database, Integrity, RLS, Audit Chain & Settlement Engine', () => {
  let pgClient: pg.Client;
  let anonClient: ReturnType<typeof createClient>;

  const DEMO_ISSUER_ID = 'e7084862-05bb-4b40-911d-46c56b12f875';
  const DEMO_VERIFIER1_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4';
  const DEMO_VERIFIER2_ID = '7b78cda8-0315-4508-9553-6c29702cd8a0';
  const DEMO_INVESTOR_ELIGIBLE_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const DEMO_INVESTOR_INELIGIBLE_ID = 'b6d21643-1124-42bd-8e12-b67c4e1feaaf';
  const DEMO_PROPERTY_ID = '11111111-1111-1111-1111-111111111111';
  const DEMO_OFFERING_ID = '33333333-3333-3333-3333-333333333333';

  beforeAll(async () => {
    pgClient = new pg.Client({ connectionString: dbUrl });
    await pgClient.connect();
    anonClient = createClient(supabaseUrl, anonKey);
  }, 60000);

  afterAll(async () => {
    if (pgClient) {
      await pgClient.end();
    }
  });

  describe('1. State Transition Machine (ARCH §9)', () => {
    it('rejects illegal property status transition (draft -> verified directly)', async () => {
      const testPropId = '99999999-0001-0000-0000-000000000001';
      await pgClient.query(
        `INSERT INTO properties (id, issuer_id, name, city, locality, property_type, normalized_address, parcel_ref_hmac, built_up_area_sqm, rr_zone_ref, status)
         VALUES ($1, $2, 'Test Prop', 'Mumbai', 'Bandra', 'Commercial', 'Addr', 'hmac1', 500, 'RR1', 'draft')
         ON CONFLICT (id) DO UPDATE SET status = 'draft'`,
        [testPropId, DEMO_ISSUER_ID]
      );

      // Attempt invalid transition directly from draft to verified
      await expect(
        pgClient.query(`UPDATE properties SET status = 'verified' WHERE id = $1`, [testPropId])
      ).rejects.toThrow(/INVALID_STATE_TRANSITION/);

      // Cleanup
      await pgClient.query(`DELETE FROM properties WHERE id = $1`, [testPropId]);
    });

    it('rejects illegal manifest status transition (draft -> approved directly)', async () => {
      const testManifestId = '99999999-0002-0000-0000-000000000002';
      await pgClient.query(
        `INSERT INTO evidence_manifests (id, property_id, version, manifest_json, manifest_hash, merkle_root, checklist_completeness, status, created_by)
         VALUES ($1, $2, 99, '{}', '0xhash', '0xroot', 50.0, 'draft', $3)
         ON CONFLICT (id) DO UPDATE SET status = 'draft'`,
        [testManifestId, DEMO_PROPERTY_ID, DEMO_ISSUER_ID]
      );

      // Attempt invalid transition directly from draft to approved
      await expect(
        pgClient.query(`UPDATE evidence_manifests SET status = 'approved' WHERE id = $1`, [testManifestId])
      ).rejects.toThrow(/INVALID_STATE_TRANSITION/);

      // Cleanup
      await pgClient.query(`DELETE FROM evidence_manifests WHERE id = $1`, [testManifestId]);
    });

    it('rejects illegal offering status transition (draft -> active directly)', async () => {
      const testOffId = '99999999-0003-0000-0000-000000000003';
      await pgClient.query(
        `INSERT INTO offerings (id, property_id, issuer_id, proposed_by, token_name, token_symbol, asset_type, ats_asset_ref, total_units, unit_price_inr, status)
         VALUES ($1, $2, $3, $3, 'Test Off', 'TST', 'COMMERCIAL_EQUITY', 'PROPERTY-MH-001', 1000, 100.00, 'draft')
         ON CONFLICT (id) DO UPDATE SET status = 'draft'`,
        [testOffId, DEMO_PROPERTY_ID, DEMO_ISSUER_ID]
      );

      // Attempt invalid transition directly from draft to active
      await expect(
        pgClient.query(`UPDATE offerings SET status = 'active' WHERE id = $1`, [testOffId])
      ).rejects.toThrow(/INVALID_STATE_TRANSITION/);

      // Cleanup
      await pgClient.query(`DELETE FROM offerings WHERE id = $1`, [testOffId]);
    });
  });

  describe('2. Separation of Duties (SoD) Triggers (ARCH §6.4)', () => {
    it('enforces SoD: property issuer cannot review their own property verification', async () => {
      await expect(
        pgClient.query(
          `INSERT INTO property_verifications (property_id, review_stage, decision, reviewer_id, policy_version)
           VALUES ($1, 'preliminary', 'verified', $2, 'v1.0')`,
          [DEMO_PROPERTY_ID, DEMO_ISSUER_ID] // Reviewer = Issuer
        )
      ).rejects.toThrow(/SOD_VIOLATION/);
    });

    it('enforces SoD: property issuer cannot approve their own evidence manifest', async () => {
      const testManifestId = '99999999-0004-0000-0000-000000000004';
      await pgClient.query(
        `INSERT INTO evidence_manifests (id, property_id, version, manifest_json, manifest_hash, merkle_root, checklist_completeness, status, created_by)
         VALUES ($1, $2, 98, '{}', '0xhash98', '0xroot98', 100.0, 'draft', $3)`,
        [testManifestId, DEMO_PROPERTY_ID, DEMO_ISSUER_ID]
      );

      await pgClient.query(`UPDATE evidence_manifests SET status = 'submitted' WHERE id = $1`, [testManifestId]);

      // Attempt approval where approved_by == property issuer
      await expect(
        pgClient.query(
          `UPDATE evidence_manifests SET status = 'approved', approved_by = $2 WHERE id = $1`,
          [testManifestId, DEMO_ISSUER_ID]
        )
      ).rejects.toThrow(/SOD_VIOLATION: Manifest approver cannot be the property issuer/);

      await pgClient.query(`DELETE FROM evidence_manifests WHERE id = $1`, [testManifestId]);
    });

    it('enforces SoD: offering proposer cannot approve their own offering', async () => {
      const testOffId = '99999999-0005-0000-0000-000000000005';
      await pgClient.query(
        `INSERT INTO offerings (id, property_id, issuer_id, proposed_by, token_name, token_symbol, asset_type, ats_asset_ref, total_units, unit_price_inr, status)
         VALUES ($1, $2, $3, $3, 'Test Off SoD', 'SOD', 'COMMERCIAL_EQUITY', 'PROPERTY-MH-001', 1000, 100.00, 'draft')`,
        [testOffId, DEMO_PROPERTY_ID, DEMO_ISSUER_ID]
      );

      await pgClient.query(`UPDATE offerings SET status = 'proposed' WHERE id = $1`, [testOffId]);
      await pgClient.query(`UPDATE offerings SET status = 'legal_review_pending' WHERE id = $1`, [testOffId]);

      // Approver is same as proposer
      await expect(
        pgClient.query(
          `UPDATE offerings SET status = 'approved_for_demo', approved_by = $2 WHERE id = $1`,
          [testOffId, DEMO_ISSUER_ID]
        )
      ).rejects.toThrow(/SOD_VIOLATION: Offering approver cannot be the proposer/);

      await pgClient.query(`DELETE FROM offerings WHERE id = $1`, [testOffId]);
    });

    it('enforces SoD: investor cannot review their own eligibility', async () => {
      await expect(
        pgClient.query(
          `INSERT INTO investor_eligibility (user_id, offering_id, status, policy_version, reviewed_by)
           VALUES ($1, $2, 'eligible', 'v1.0', $1)`, // reviewed_by == user_id
          [DEMO_INVESTOR_ELIGIBLE_ID, DEMO_OFFERING_ID]
        )
      ).rejects.toThrow(/chk_eligibility_reviewer_not_user|SOD_VIOLATION/);
    });
  });

  describe('3. Immutability Enforcements (ARCH §17.2)', () => {
    it('blocks alteration of approved manifest content', async () => {
      const manifestId = '22222222-2222-2222-2222-222222222222';
      await expect(
        pgClient.query(
          `UPDATE evidence_manifests SET merkle_root = '0xtampered' WHERE id = $1`,
          [manifestId]
        )
      ).rejects.toThrow(/IMMUTABILITY_VIOLATION/);
    });

    it('blocks modification or deletion of property_snapshots rows', async () => {
      await expect(
        pgClient.query(
          `UPDATE property_snapshots SET occupancy_pct = 99.0 WHERE property_id = $1`,
          [DEMO_PROPERTY_ID]
        )
      ).rejects.toThrow(/IMMUTABILITY_VIOLATION: property_snapshots table is append-only/);

      await expect(
        pgClient.query(
          `DELETE FROM property_snapshots WHERE property_id = $1`,
          [DEMO_PROPERTY_ID]
        )
      ).rejects.toThrow(/IMMUTABILITY_VIOLATION: property_snapshots table is append-only/);
    });
  });

  describe('4. Tamper-Evident Audit Log Hash Chain (ARCH §17.2, §17.5)', () => {
    it('appends audit log entries with contiguous SHA-256 hash chaining', async () => {
      const id1 = await appendAuditLog({
        actorUserId: DEMO_VERIFIER1_ID,
        action: 'TEST_AUDIT_ACTION_1',
        resourceType: 'properties',
        resourceId: DEMO_PROPERTY_ID,
        reason: 'Automated test step 1',
      });

      const id2 = await appendAuditLog({
        actorUserId: DEMO_VERIFIER2_ID,
        action: 'TEST_AUDIT_ACTION_2',
        resourceType: 'properties',
        resourceId: DEMO_PROPERTY_ID,
        reason: 'Automated test step 2',
      });

      const { rows } = await pgClient.query(
        `SELECT id, prev_hash, row_hash FROM audit_logs WHERE id IN ($1, $2) ORDER BY id ASC`,
        [id1, id2]
      );

      expect(rows.length).toBe(2);
      // Row 2 prev_hash must strictly equal Row 1 row_hash
      expect(rows[1].prev_hash).toBe(rows[0].row_hash);
      expect(rows[0].row_hash).toHaveLength(64);
      expect(rows[1].row_hash).toHaveLength(64);
    });

    it('enforces SQL-level revocation of UPDATE and DELETE on audit_logs for application roles', async () => {
      // Under anon / authenticated role, direct UPDATE and DELETE are revoked
      await pgClient.query('SET ROLE anon');
      try {
        await expect(
          pgClient.query(`UPDATE audit_logs SET action = 'ALTERED' WHERE id = 1`)
        ).rejects.toThrow(/permission denied for table audit_logs/);

        await expect(
          pgClient.query(`DELETE FROM audit_logs WHERE id = 1`)
        ).rejects.toThrow(/permission denied for table audit_logs/);
      } finally {
        await pgClient.query('RESET ROLE');
      }
    });
  });

  describe('5. Row Level Security (RLS) Isolation (ARCH §18)', () => {
    it('blocks anonymous access to private investment orders', async () => {
      const { data } = await anonClient.from('investment_orders').select('*');
      expect(data).toEqual([]);
    });

    it('blocks anonymous access to internal outbox jobs', async () => {
      const { data } = await anonClient.from('outbox_jobs').select('*');
      expect(data).toEqual([]);
    });

    it('allows anonymous read of public offering details via public_offering_view', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await anonClient.rpc('public_offering_view', {
        p_offering_id: DEMO_OFFERING_ID,
      } as any);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      const records = data as unknown as Record<string, unknown>[];
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].token_symbol).toBe('PROPERTY-MH-001');
      expect(records[0].status).toBe('active');
    });
  });

  describe('6. Atomic Settlement Engine & reserve_units (ARCH §17.4)', () => {
    beforeEach(async () => {
      await pgClient.query(`UPDATE offerings SET status = 'active' WHERE id = $1`, [DEMO_OFFERING_ID]);
      await pgClient.query(`
        UPDATE profiles
           SET wallet_address = '0x0000000000000000000000000000000000ace2c6',
               wallet_verified_at = now()
         WHERE id = $1
      `, [DEMO_INVESTOR_ELIGIBLE_ID]);
      await pgClient.query(`
        INSERT INTO investor_eligibility (
          user_id, offering_id, status, policy_version, reviewed_by, valid_until, reason_code, chain_status
        ) VALUES (
          $1, $2, 'eligible', 'v1.0', $3, now() + interval '1 year', 'VERIFIED_KYC_ACCREDITED', 'registered'
        )
        ON CONFLICT (user_id, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid))
        WHERE status IN ('pending', 'eligible')
        DO UPDATE SET status = 'eligible', chain_status = 'registered', valid_until = now() + interval '1 year'
      `, [DEMO_INVESTOR_ELIGIBLE_ID, DEMO_OFFERING_ID, DEMO_VERIFIER1_ID]);
    });

    it('successfully reserves units for eligible investor with verified wallet', async () => {
      const idempotencyKey = `test_res_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const orderId = await reserveUnitsRpc({
        idempotencyKey,
        investorId: DEMO_INVESTOR_ELIGIBLE_ID,
        offeringId: DEMO_OFFERING_ID,
        units: 2n,
        ackMessage: 'I acknowledge the legal risk disclosures and non-voting fractional commercial equity terms.',
        ackSignature: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b',
        ttlMinutes: 15,
      });

      expect(orderId).toBeDefined();

      // Verify the order in database
      const { rows } = await pgClient.query(`SELECT * FROM investment_orders WHERE id = $1`, [orderId]);
      expect(rows.length).toBe(1);
      expect(rows[0].units).toBe('2');
      expect(rows[0].unit_price_inr).toBe('24000.00');
      expect(rows[0].amount_inr).toBe('48000.00');
      expect(rows[0].status).toBe('PAYMENT_PENDING');

      // Re-invoking with same idempotency key returns identical order ID without duplicate insert
      const secondCallId = await reserveUnitsRpc({
        idempotencyKey,
        investorId: DEMO_INVESTOR_ELIGIBLE_ID,
        offeringId: DEMO_OFFERING_ID,
        units: 2n,
        ackMessage: 'Re-attempt with same key',
        ackSignature: '0xsig',
      });
      expect(secondCallId).toBe(orderId);
    });

    it('rejects unverified wallet with WALLET_NOT_VERIFIED', async () => {
      const key = `test_fail_wallet_${Date.now()}`;
      await expect(
        reserveUnitsRpc({
          idempotencyKey: key,
          investorId: DEMO_INVESTOR_INELIGIBLE_ID, // Has no verified wallet
          offeringId: DEMO_OFFERING_ID,
          units: 1n,
          ackMessage: 'Test ack',
          ackSignature: '0xsig',
        })
      ).rejects.toThrow(/WALLET_NOT_VERIFIED/);
    });

    it('rejects order below minimum units with BELOW_MINIMUM', async () => {
      const key = `test_fail_min_${Date.now()}`;
      await expect(
        reserveUnitsRpc({
          idempotencyKey: key,
          investorId: DEMO_INVESTOR_ELIGIBLE_ID,
          offeringId: DEMO_OFFERING_ID,
          units: 0n, // Below minimum of 1
          ackMessage: 'Test ack',
          ackSignature: '0xsig',
        })
      ).rejects.toThrow(/BELOW_MINIMUM/);
    });

    it('rejects order above investor cap with ABOVE_INVESTOR_MAX', async () => {
      const key = `test_fail_max_${Date.now()}`;
      await expect(
        reserveUnitsRpc({
          idempotencyKey: key,
          investorId: DEMO_INVESTOR_ELIGIBLE_ID,
          offeringId: DEMO_OFFERING_ID,
          units: 501n, // Max is 500
          ackMessage: 'Test ack',
          ackSignature: '0xsig',
        })
      ).rejects.toThrow(/ABOVE_INVESTOR_MAX/);
    });

    it('rejects reservation if offering is drift-paused with OFFERING_PAUSED_EVIDENCE', async () => {
      try {
        await pgClient.query(`UPDATE offerings SET status = 'paused_evidence_drift' WHERE id = $1`, [DEMO_OFFERING_ID]);

        const key = `test_fail_drift_${Date.now()}`;
        await expect(
          reserveUnitsRpc({
            idempotencyKey: key,
            investorId: DEMO_INVESTOR_ELIGIBLE_ID,
            offeringId: DEMO_OFFERING_ID,
            units: 1n,
            ackMessage: 'Test ack',
            ackSignature: '0xsig',
          })
        ).rejects.toThrow(/OFFERING_PAUSED_EVIDENCE/);
      } finally {
        await pgClient.query(`UPDATE offerings SET status = 'active' WHERE id = $1`, [DEMO_OFFERING_ID]);
      }
    });

    it('handles concurrent reservations serializing cleanly via Postgres row lock', async () => {
      // Run 5 parallel reservation requests with distinct idempotency keys
      const promises = Array.from({ length: 5 }, (_, i) =>
        reserveUnitsRpc({
          idempotencyKey: `parallel_res_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
          investorId: DEMO_INVESTOR_ELIGIBLE_ID,
          offeringId: DEMO_OFFERING_ID,
          units: 1n,
          ackMessage: `Concurrent ack ${i}`,
          ackSignature: `0xsig${i}`,
          ttlMinutes: 15,
        })
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(5);
      const uniqueIds = new Set(results);
      expect(uniqueIds.size).toBe(5); // 5 distinct orders created without collision
    });
  });
});
