/**
 * Milestone M5: Settlement Engine Test Suite
 * ARCH §9.4, §14 (all), §15.2, §17.4, §19, §22.1, §22.3 · PRD FR-5.x · PLAN M5
 *
 * Safe, idempotent, recoverable settlement from signed order to chain-confirmed allocation.
 * Never falsely complete.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { NextRequest } from 'next/server';

// Ensure environment variables are loaded
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx > 0) {
    const k = trimmed.slice(0, eqIdx).trim();
    const v = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

// Enable test flags
process.env.DEMO_PAYMENTS = 'true';
if (!process.env.CRON_SECRET) {
  process.env.CRON_SECRET = 'test-cron-secret-nivasa-secure-m4';
}

import { POST as investmentHandler } from '../app/api/investments/route';
import { GET as getOrderHandler } from '../app/api/investments/[id]/route';
import { POST as paymentConfirmHandler } from '../app/api/demo/payment-confirmation/route';
import { POST as workerHandler } from '../app/api/cron/worker/route';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '../lib/wallet/investment-acknowledgement';
import { processAllocateUnits } from '../lib/settlement/jobs/allocate-units';
import { processReconcileOrder } from '../lib/settlement/jobs/reconcile-order';
import { readHolderBalance, readTokenSupply } from '../lib/hedera/chain-reads';

describe('Milestone M5: Settlement Engine & Recovery', () => {
  let pgClient: pg.Client;
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

  // Seeded actor IDs
  const INVESTOR_ELIGIBLE_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const INVESTOR_INELIGIBLE_ID = 'b6d21643-1124-42bd-8e12-b67c4e1feaaf';
  const VERIFIER_1_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4';
  const ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';
  const DEMO_OFFERING_ID = '33333333-3333-3333-3333-333333333333';

  // Test wallet matching INVESTOR_ELIGIBLE_ID
  const investorWallet = new ethers.Wallet(
    '0x633379b3635952c10b0162024bc68c07e05fc867a5b3a4a169b1834927cb5219'
  );

  let activeRights: { version: number; rights_document_hash: string; unit_price_inr: string };

  beforeAll(async () => {
    pgClient = new pg.Client({ connectionString: dbUrl });
    await pgClient.connect();

    // Query active offering rights
    const { rows: rightsRows } = await pgClient.query(`
      SELECT r.version, r.rights_document_hash, o.unit_price_inr
        FROM offerings o
        JOIN offering_rights r ON r.offering_id = o.id AND r.version = o.current_rights_version
       WHERE o.id = '${DEMO_OFFERING_ID}';
    `);
    activeRights = {
      version: rightsRows[0].version,
      rights_document_hash: rightsRows[0].rights_document_hash,
      unit_price_inr: Number(rightsRows[0].unit_price_inr).toFixed(2),
    };
  }, 30000);

  afterAll(async () => {
    if (pgClient) {
      await pgClient.end();
    }
  });

  beforeEach(async () => {
    // Reset offering to active and ensure investor has bound wallet and eligible status
    await pgClient.query(`
      UPDATE offerings SET status = 'active' WHERE id = '${DEMO_OFFERING_ID}';
      UPDATE profiles SET wallet_address = NULL WHERE wallet_address = '${investorWallet.address.toLowerCase()}' AND id != '${INVESTOR_ELIGIBLE_ID}';
      UPDATE profiles
         SET wallet_address = '${investorWallet.address.toLowerCase()}',
             wallet_verified_at = now()
       WHERE id = '${INVESTOR_ELIGIBLE_ID}';
      INSERT INTO investor_eligibility (
        user_id, offering_id, status, policy_version, reviewed_by, valid_until, reason_code, chain_status
      ) VALUES (
        '${INVESTOR_ELIGIBLE_ID}', '${DEMO_OFFERING_ID}', 'eligible', 'v1.0', '${VERIFIER_1_ID}',
        now() + interval '1 year', 'KYC_ACCREDITED_SEEDED', 'registered'
      )
      ON CONFLICT (user_id, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid))
      WHERE status IN ('pending', 'eligible')
      DO UPDATE SET status = 'eligible', chain_status = 'registered', valid_until = now() + interval '1 year';
    `);
  });

  describe('1. Order Reservation & Acknowledgement Verification (POST /api/investments)', () => {
    it('requires Idempotency-Key header', async () => {
      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({ offeringId: DEMO_OFFERING_ID, units: 1 }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_FAILED');
      expect(json.error.message).toMatch(/Idempotency-Key header is required/i);
    });

    it('rejects order if acknowledgement terms differ from DB values', async () => {
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: '0xWRONG_HASH', // Tampered hash!
        units: '2',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: (2 * Number(activeRights.unit_price_inr)).toFixed(2),
        walletAddress: investorWallet.address,
        nonce: 'nonce_test_terms',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_mismatch_${Date.now()}`,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 2,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: '0xWRONG_HASH',
            units: '2',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: (2 * Number(activeRights.unit_price_inr)).toFixed(2),
            walletAddress: investorWallet.address,
            nonce: 'nonce_test_terms',
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_FAILED');
      expect(json.error.message).toMatch(/hash mismatch/i);
    });

    it('rejects order if signature does not match bound wallet', async () => {
      const otherWallet = ethers.Wallet.createRandom();
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units: '2',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: (2 * Number(activeRights.unit_price_inr)).toFixed(2),
        walletAddress: investorWallet.address, // Claiming investorWallet
        nonce: 'nonce_wrong_signer',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });
      // Signed by a different wallet
      const signature = await otherWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_bad_sig_${Date.now()}`,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 2,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units: '2',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: (2 * Number(activeRights.unit_price_inr)).toFixed(2),
            walletAddress: investorWallet.address,
            nonce: 'nonce_wrong_signer',
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      expect(res.status).toBe(400);
      expect(json.error.code).toBe('VALIDATION_FAILED');
      expect(json.error.message).toMatch(/does not match bound wallet/i);
    });

    it('successfully reserves units with valid signature and terms', async () => {
      const idempotencyKey = `idemp_valid_${Date.now()}`;
      const units = '2';
      const totalAmountInr = (Number(units) * Number(activeRights.unit_price_inr)).toFixed(2);
      const expiresAt = new Date(Date.now() + 600000).toISOString();
      const nonce = `nonce_${Date.now()}`;

      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units,
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr,
        walletAddress: investorWallet.address,
        nonce,
        expiresAt,
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 2,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units,
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      expect(res.status).toBe(201);

      expect(json.success).toBe(true);
      expect(json.orderId).toBeDefined();
      expect(json.status).toBe('PAYMENT_PENDING');
      expect(json.receiptToken).toBeDefined();

      // Idempotent retry with identical key returns 200 with the exact same order
      const retryReq = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 2,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units,
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const retryRes = await investmentHandler(retryReq);
      expect(retryRes.status).toBe(200);
      const retryJson = await retryRes.json();
      expect(retryJson.orderId).toBe(json.orderId);
    });
  });

  describe('2. Offering Pause & Restriction Guardrails (ARCH §17.4)', () => {
    it('refuses reservation when offering is paused_evidence_drift with OFFERING_PAUSED_EVIDENCE', async () => {
      await pgClient.query(`UPDATE offerings SET status = 'paused_evidence_drift' WHERE id = '${DEMO_OFFERING_ID}';`);

      const nonce = `nonce_drift_${Date.now()}`;
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units: '1',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: activeRights.unit_price_inr,
        walletAddress: investorWallet.address,
        nonce,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_drift_${Date.now()}`,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 1,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units: '1',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: activeRights.unit_price_inr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('OFFERING_PAUSED_EVIDENCE');
    });

    it('refuses reservation when offering is not active with OFFERING_NOT_ACTIVE', async () => {
      await pgClient.query(`UPDATE offerings SET status = 'paused' WHERE id = '${DEMO_OFFERING_ID}';`);

      const nonce = `nonce_paused_${Date.now()}`;
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units: '1',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: activeRights.unit_price_inr,
        walletAddress: investorWallet.address,
        nonce,
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `idemp_paused_${Date.now()}`,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 1,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units: '1',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: activeRights.unit_price_inr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt: new Date(Date.now() + 600000).toISOString(),
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe('OFFERING_NOT_ACTIVE');
    });
  });

  describe('3. Simulated Payment Confirmation & Outbox Trigger (POST /api/demo/payment-confirmation)', () => {
    let testOrderId: string;

    beforeEach(async () => {
      // Create a fresh test order in PAYMENT_PENDING
      const idempotencyKey = `idemp_payment_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const expiresAt = new Date(Date.now() + 600000).toISOString();
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units: '1',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: activeRights.unit_price_inr,
        walletAddress: investorWallet.address,
        nonce,
        expiresAt,
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 1,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units: '1',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: activeRights.unit_price_inr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      testOrderId = json.orderId;
    });

    it('refuses payment confirmation from non-admin role', async () => {
      const req = new NextRequest('http://localhost/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID, // Non-admin caller!
        },
        body: JSON.stringify({ orderId: testOrderId }),
      });

      const res = await paymentConfirmHandler(req);
      expect(res.status).toBe(403);
    });

    it('moves order to PAYMENT_CONFIRMED and trigger automatically inserts allocate_units job', async () => {
      const req = new NextRequest('http://localhost/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({ orderId: testOrderId }),
      });

      const res = await paymentConfirmHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('PAYMENT_CONFIRMED');

      // Verify trigger inserted outbox_jobs record with dedupe_key = orderId
      const { rows } = await pgClient.query(`
        SELECT * FROM outbox_jobs WHERE type = 'allocate_units' AND dedupe_key = '${testOrderId}';
      `);
      expect(rows.length).toBe(1);
      expect(rows[0].status).toBe('pending');
      expect(rows[0].payload.orderId).toBe(testOrderId);
    });

    it('replaying payment confirmation is idempotent and does not create extra jobs', async () => {
      // First confirmation
      const req1 = new NextRequest('http://localhost/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({ orderId: testOrderId }),
      });
      await paymentConfirmHandler(req1);

      // Replay
      const req2 = new NextRequest('http://localhost/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({ orderId: testOrderId }),
      });
      const res2 = await paymentConfirmHandler(req2);
      expect(res2.status).toBe(200);

      // Verify only 1 outbox job exists
      const { rows } = await pgClient.query(`
        SELECT count(*) FROM outbox_jobs WHERE type = 'allocate_units' AND dedupe_key = '${testOrderId}';
      `);
      expect(Number(rows[0].count)).toBe(1);
    });
  });

  describe('4. Allocation, Outbox Worker & Hedera Reconciliation', () => {
    let orderToAllocateId: string;

    beforeEach(async () => {
      const idempotencyKey = `idemp_alloc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const expiresAt = new Date(Date.now() + 600000).toISOString();
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion: activeRights.version,
        rightsDocumentHash: activeRights.rights_document_hash,
        units: '1',
        unitPriceInr: activeRights.unit_price_inr,
        totalAmountInr: activeRights.unit_price_inr,
        walletAddress: investorWallet.address,
        nonce,
        expiresAt,
      });
      const signature = await investorWallet.signMessage(ackMessage);

      const req = new NextRequest('http://localhost/api/investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
        },
        body: JSON.stringify({
          offeringId: DEMO_OFFERING_ID,
          units: 1,
          acknowledgement: {
            offeringId: DEMO_OFFERING_ID,
            rightsVersion: activeRights.version,
            rightsDocumentHash: activeRights.rights_document_hash,
            units: '1',
            unitPriceInr: activeRights.unit_price_inr,
            totalAmountInr: activeRights.unit_price_inr,
            walletAddress: investorWallet.address,
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature,
          },
        }),
      });

      const res = await investmentHandler(req);
      const json = await res.json();
      orderToAllocateId = json.orderId;

      // Confirm payment
      const payReq = new NextRequest('http://localhost/api/demo/payment-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({ orderId: orderToAllocateId }),
      });
      await paymentConfirmHandler(payReq);
    });

    it('enforces DB constraint: at most one confirmed allocation attempt per order', async () => {
      // Direct SQL attempt to insert two confirmed attempts for same order
      await pgClient.query(`
        INSERT INTO allocation_attempts (order_id, attempt_no, chain_tx_id, signed_tx_hash, status)
        VALUES ('${orderToAllocateId}', 1, 'tx_1', 'hash_1', 'confirmed');
      `);

      // Second confirmed attempt MUST fail with unique constraint violation
      await expect(
        pgClient.query(`
          INSERT INTO allocation_attempts (order_id, attempt_no, chain_tx_id, signed_tx_hash, status)
          VALUES ('${orderToAllocateId}', 2, 'tx_2', 'hash_2', 'confirmed');
        `)
      ).rejects.toThrow(/uq_allocation_attempts_one_confirmed/);

      // Clean up for other tests
      await pgClient.query(`DELETE FROM allocation_attempts WHERE order_id = '${orderToAllocateId}';`);
    });

    it('fails closed to MANUAL_REVIEW if investor eligibility was revoked before allocation', async () => {
      // Revoke eligibility in DB
      await pgClient.query(`
        UPDATE investor_eligibility
           SET status = 'revoked', chain_status = 'revoked'
         WHERE user_id = '${INVESTOR_ELIGIBLE_ID}';
      `);

      const res = await processAllocateUnits({ orderId: orderToAllocateId });
      expect(res.success).toBe(false);
      expect(res.action).toBe('manual_review');

      // Verify order moved to MANUAL_REVIEW, NEVER COMPLETED
      const { rows } = await pgClient.query(`
        SELECT status FROM investment_orders WHERE id = '${orderToAllocateId}';
      `);
      expect(rows[0].status).toBe('MANUAL_REVIEW');
    });

    it('handles simulated timeout after submit: confirms via Mirror Node without double allocation', async () => {
      // 1. First execution with timeout_after_submit fault
      const faultResult = await processAllocateUnits({
        orderId: orderToAllocateId,
        injectedFault: 'timeout_after_submit',
      });
      expect(faultResult.action).toBe('injected_timeout');

      // Verify attempt was persisted with status = 'unknown'
      const { rows: attemptRows } = await pgClient.query(`
        SELECT status, chain_tx_id FROM allocation_attempts WHERE order_id = '${orderToAllocateId}';
      `);
      expect(attemptRows.length).toBe(1);
      expect(attemptRows[0].status).toBe('unknown');

      // 2. Recovery execution: recovers the stored tx on Mirror Node, confirms, and transitions to ALLOCATION_CONFIRMED
      const recoveryResult = await processAllocateUnits({ orderId: orderToAllocateId });
      expect(recoveryResult.success).toBe(true);

      // Verify only 1 confirmed attempt exists
      const { rows: confirmedRows } = await pgClient.query(`
        SELECT status FROM allocation_attempts WHERE order_id = '${orderToAllocateId}' AND status = 'confirmed';
      `);
      expect(confirmedRows.length).toBe(1);

      // 3. Reconcile order
      const reconcileResult = await processReconcileOrder({ orderId: orderToAllocateId });
      expect(reconcileResult.success).toBe(true);
      expect(reconcileResult.action).toBe('completed');

      // Order is now COMPLETED
      const { rows: finalOrder } = await pgClient.query(`
        SELECT status FROM investment_orders WHERE id = '${orderToAllocateId}';
      `);
      expect(finalOrder[0].status).toBe('COMPLETED');
    });

    it('end-to-end: executes worker, issues units on Hedera Testnet, reconciles, and reaches COMPLETED', async () => {
      // 1. Process allocate_units
      const allocResult = await processAllocateUnits({ orderId: orderToAllocateId });
      expect(allocResult.success).toBe(true);
      expect(allocResult.action).toBe('confirmed');
      expect(allocResult.txId).toBeDefined();

      // 2. Process reconcile_order (the ONLY place COMPLETED is set)
      const reconcileResult = await processReconcileOrder({ orderId: orderToAllocateId });
      expect(reconcileResult.success).toBe(true);
      expect(reconcileResult.action).toBe('completed');

      // 3. Query order via GET /api/investments/:id (timeline poll)
      const pollReq = new NextRequest(`http://localhost/api/investments/${orderToAllocateId}`, {
        method: 'GET',
        headers: { 'x-demo-user-id': INVESTOR_ELIGIBLE_ID },
      });
      const pollRes = await getOrderHandler(pollReq, { params: Promise.resolve({ id: orderToAllocateId }) });
      expect(pollRes.status).toBe(200);

      const pollJson = await pollRes.json();
      expect(pollJson.order.status).toBe('COMPLETED');
      expect(pollJson.attempts.length).toBe(1);
      expect(pollJson.attempts[0].status).toBe('confirmed');
      expect(pollJson.assertions.isReconciled).toBe(true);
      expect(pollJson.assertions.unitsOnChainConfirmed).toBe('1');
    });
  });
});
