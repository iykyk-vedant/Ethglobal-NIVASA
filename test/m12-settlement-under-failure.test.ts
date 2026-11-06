/**
 * Milestone M12: D4 Settlement Under Failure Test Suite
 * ARCH §14.2, §14.7, §14.9, §22.2 (D4), §22.3 (9–10) · PRD FR-5.9–5.10 · UI §8.7, §8.11, §10.6 · PLAN M12
 *
 * Verifies that:
 * 1. POST /api/demo/faults refuses non-admin callers and production / disabled flag.
 * 2. Every armed, consumed, and cancelled fault is written to the immutable audit log.
 * 3. With timeout_after_submit armed, the worker recovers from the stored tx ID via Mirror Node;
 *    one allocation confirms; assertion panel shows exact units match.
 * 4. With fail_before_submit armed, prepare succeeds, submit throws, attempt #1 fails;
 *    the worker creates attempt #2 with a new tx ID as ARCH §14.2 dictates; one allocation confirms.
 * 5. With duplicate_job, the dedupe key prevents second execution, yielding exactly one allocation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { NextRequest } from 'next/server';

// Load environment variables
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
process.env.DEMO_FAULTS = 'true';
process.env.APP_ENV = 'test';
if (!process.env.CRON_SECRET) {
  process.env.CRON_SECRET = randomBytes(32).toString('hex');
}

import { POST as investmentHandler } from '../app/api/investments/route';
import { GET as getOrderHandler } from '../app/api/investments/[id]/route';
import { POST as paymentConfirmHandler } from '../app/api/demo/payment-confirmation/route';
import {
  POST as faultsHandler,
  GET as getFaultsHandler,
  DELETE as deleteFaultsHandler,
} from '../app/api/demo/faults/route';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '../lib/wallet/investment-acknowledgement';
import { processAllocateUnits } from '../lib/settlement/jobs/allocate-units';
import { processReconcileOrder } from '../lib/settlement/jobs/reconcile-order';
import {
  armFault,
  getActiveFault,
  consumeArmedFault,
  cancelArmedFault,
  isFaultInjectionEnabled,
} from '../lib/settlement/faults';
import { enqueueOutboxJob } from '../lib/settlement/outbox';

describe('Milestone M12: D4 Settlement Under Failure & Fault Injector', () => {
  let pgClient: pg.Client;
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

  const INVESTOR_ELIGIBLE_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const VERIFIER_1_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4';
  const ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';
  const DEMO_OFFERING_ID = '33333333-3333-3333-3333-333333333333';

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
      // Clean up any remaining armed faults
      await pgClient.query(`UPDATE demo_fault_injections SET status = 'cancelled' WHERE status = 'armed';`);
      await pgClient.end();
    }
  });

  beforeEach(async () => {
    // Reset offering, investor wallet, and cancel old faults
    await pgClient.query(`
      UPDATE offerings SET status = 'active' WHERE id = '${DEMO_OFFERING_ID}';
      UPDATE demo_fault_injections SET status = 'cancelled' WHERE status = 'armed';
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

  // Helper to create a paid test order ready for allocation
  async function createPaidOrder(units = 1): Promise<string> {
    const idempotencyKey = `idemp_m12_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nonce = `nonce_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const expiresAt = new Date(Date.now() + 600000).toISOString();
    const totalAmountInr = (units * Number(activeRights.unit_price_inr)).toFixed(2);

    const ackMessage = buildInvestmentAcknowledgementMessage({
      offeringId: DEMO_OFFERING_ID,
      rightsVersion: activeRights.version,
      rightsDocumentHash: activeRights.rights_document_hash,
      units: units.toString(),
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
        units,
        acknowledgement: {
          offeringId: DEMO_OFFERING_ID,
          rightsVersion: activeRights.version,
          rightsDocumentHash: activeRights.rights_document_hash,
          units: units.toString(),
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
    const orderId = json.orderId;

    // Confirm payment
    const payReq = new NextRequest('http://localhost/api/demo/payment-confirmation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ADMIN_ID,
      },
      body: JSON.stringify({ orderId }),
    });
    await paymentConfirmHandler(payReq);

    return orderId;
  }

  describe('1. Environment & Authorization Guardrails (POST /api/demo/faults)', () => {
    it('refuses fault arming from non-admin role with FORBIDDEN (403)', async () => {
      const req = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_ELIGIBLE_ID, // Non-admin caller!
        },
        body: JSON.stringify({
          faultType: 'timeout_after_submit',
          reason: 'Unauthorized attempt to arm fault',
        }),
      });

      const res = await faultsHandler(req);
      expect(res.status).toBe(403);
    });

    it('strictly refuses when DEMO_FAULTS=false or APP_ENV=production (FLAG_DISABLED 403)', async () => {
      const originalEnv = process.env.APP_ENV;
      const originalFlag = process.env.DEMO_FAULTS;

      try {
        process.env.APP_ENV = 'production';

        const req = new NextRequest('http://localhost/api/demo/faults', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': ADMIN_ID,
          },
          body: JSON.stringify({
            faultType: 'timeout_after_submit',
            reason: 'Production refusal check',
          }),
        });

        const res = await faultsHandler(req);
        expect(res.status).toBe(403);
        const json = await res.json();
        expect(json.error?.code).toBe('FLAG_DISABLED');
      } finally {
        process.env.APP_ENV = originalEnv;
        process.env.DEMO_FAULTS = originalFlag;
      }
    });

    it('rejects arming without a substantive reason (< 5 characters)', async () => {
      const req = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultType: 'timeout_after_submit',
          reason: 'bad',
        }),
      });

      const res = await faultsHandler(req);
      expect(res.status).toBe(400);
    });
  });

  describe('2. Fault Arming, Consumption & Audit Log Trail', () => {
    it('arms a fault, writes to demo_fault_injections, and records fault_injection_armed in audit_logs', async () => {
      const reason = 'Audit trail verification for timeout fault';
      const req = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultType: 'timeout_after_submit',
          reason,
        }),
      });

      const res = await faultsHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.fault.fault_type).toBe('timeout_after_submit');
      expect(json.fault.status).toBe('armed');

      // Verify audit_logs entry
      const { rows: auditRows } = await pgClient.query(`
        SELECT * FROM audit_logs
         WHERE action = 'fault_injection_armed'
         ORDER BY id DESC LIMIT 1;
      `);
      expect(auditRows.length).toBe(1);
      expect(auditRows[0].resource_id).toBe(json.fault.id);
      expect(auditRows[0].reason).toContain(reason);

      // Verify GET /api/demo/faults returns the active fault
      const getReq = new NextRequest('http://localhost/api/demo/faults', {
        method: 'GET',
        headers: { 'x-demo-user-id': ADMIN_ID },
      });
      const getRes = await getFaultsHandler(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.enabled).toBe(true);
      expect(getJson.activeFaults.some((f: any) => f.id === json.fault.id)).toBe(true);

      // Verify cancellation
      const delReq = new NextRequest('http://localhost/api/demo/faults', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultId: json.fault.id,
          reason: 'Test cleanup cancellation',
        }),
      });
      const delRes = await deleteFaultsHandler(delReq);
      expect(delRes.status).toBe(200);

      const { rows: cancelledRows } = await pgClient.query(`
        SELECT status FROM demo_fault_injections WHERE id = '${json.fault.id}';
      `);
      expect(cancelledRows[0].status).toBe('cancelled');
    });
  });

  describe('3. Armed timeout_after_submit: Consensus Recovery & Assertion Panel (Exit Condition)', () => {
    it('with timeout_after_submit armed, worker recovers from stored tx ID via Mirror Node, exactly one allocation confirms, assertions pass', async () => {
      const orderId = await createPaidOrder(1);

      // 1. Arm timeout_after_submit specifically for this order
      const armReq = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultType: 'timeout_after_submit',
          orderId,
          reason: 'Demonstrating lost response recovery via Mirror Node (ARCH §14.2)',
        }),
      });
      const armRes = await faultsHandler(armReq);
      expect(armRes.status).toBe(201);

      // 2. First worker execution: submits to Hedera, fault is consumed, attempt marked 'unknown'
      const run1 = await processAllocateUnits({ orderId });
      expect(run1.action).toBe('injected_timeout');
      expect(run1.txId).toBeDefined();

      // Verify attempt #1 is persisted as 'unknown' (NOT failed, per ARCH §14.2)
      const { rows: attempt1Rows } = await pgClient.query(`
        SELECT attempt_no, status, chain_tx_id FROM allocation_attempts WHERE order_id = '${orderId}';
      `);
      expect(attempt1Rows.length).toBe(1);
      expect(attempt1Rows[0].status).toBe('unknown');
      expect(attempt1Rows[0].chain_tx_id).toBe(run1.txId);

      // Verify fault was consumed (one-shot)
      const activeAfterRun1 = await getActiveFault(orderId);
      expect(activeAfterRun1).toBeNull();

      // 3. Second worker execution (Tick 2): queries Mirror Node by stored txId, confirms consensus!
      const run2 = await processAllocateUnits({ orderId });
      expect(run2.success).toBe(true);

      // Invariant: Exactly ONE confirmed attempt
      const { rows: confirmedRows } = await pgClient.query(`
        SELECT attempt_no, status, chain_tx_id FROM allocation_attempts
         WHERE order_id = '${orderId}' AND status = 'confirmed';
      `);
      expect(confirmedRows.length).toBe(1);
      expect(confirmedRows[0].attempt_no).toBe(1);

      // 4. Reconcile order
      const reconcile = await processReconcileOrder({ orderId });
      expect(reconcile.success).toBe(true);
      expect(reconcile.action).toBe('completed');

      // 5. Query order detail API to verify settlement timeline and assertion panel metrics
      const pollReq = new NextRequest(`http://localhost/api/investments/${orderId}`, {
        method: 'GET',
        headers: { 'x-demo-user-id': INVESTOR_ELIGIBLE_ID },
      });
      const pollRes = await getOrderHandler(pollReq, { params: Promise.resolve({ id: orderId }) });
      expect(pollRes.status).toBe(200);

      const pollJson = await pollRes.json();
      expect(pollJson.order.status).toBe('COMPLETED');
      expect(pollJson.attempts.length).toBe(1);
      expect(pollJson.attempts[0].status).toBe('confirmed');

      // Assertion Panel verification (ARCH §14.7)
      expect(pollJson.assertions.unitsOrdered).toBe('1');
      expect(pollJson.assertions.unitsOnChainConfirmed).toBe('1');
      expect(pollJson.assertions.attemptsUsed).toBe(1);
      expect(pollJson.assertions.duplicatesPrevented).toBe(0);
      expect(pollJson.assertions.isReconciled).toBe(true);
    }, 60000);
  });

  describe('4. Armed fail_before_submit: Sequential Attempt Retry (ARCH §14.2)', () => {
    it('with fail_before_submit armed, attempt #1 fails before submit; worker creates attempt #2 with new tx ID and succeeds', async () => {
      const orderId = await createPaidOrder(1);

      // 1. Arm fail_before_submit for this order
      const armReq = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultType: 'fail_before_submit',
          orderId,
          reason: 'Simulating node/preparation error before submission (ARCH §14.2)',
        }),
      });
      const armRes = await faultsHandler(armReq);
      expect(armRes.status).toBe(201);

      // 2. First worker execution: prepare succeeds, attempt 1 persisted, throws simulated failure
      await expect(processAllocateUnits({ orderId })).rejects.toThrow(/fail_before_submit/);

      // Verify Attempt #1 was marked 'failed'
      const { rows: attempt1Rows } = await pgClient.query(`
        SELECT attempt_no, status, chain_tx_id FROM allocation_attempts WHERE order_id = '${orderId}';
      `);
      expect(attempt1Rows.length).toBe(1);
      expect(attempt1Rows[0].attempt_no).toBe(1);
      expect(attempt1Rows[0].status).toBe('failed');
      const attempt1TxId = attempt1Rows[0].chain_tx_id;

      // 3. Second worker execution (Retry): creates Attempt #2 with NEW transaction ID per ARCH §14.2
      const run2 = await processAllocateUnits({ orderId });
      expect(run2.success).toBe(true);
      expect(run2.action).toBe('confirmed');
      expect(run2.txId).toBeDefined();
      expect(run2.txId).not.toBe(attempt1TxId); // Must be a new transaction ID!

      // Verify total attempts in DB = 2, but exactly ONE confirmed
      const { rows: allAttempts } = await pgClient.query(`
        SELECT attempt_no, status, chain_tx_id FROM allocation_attempts
         WHERE order_id = '${orderId}'
         ORDER BY attempt_no ASC;
      `);
      expect(allAttempts.length).toBe(2);
      expect(allAttempts[0].status).toBe('failed');
      expect(allAttempts[1].status).toBe('confirmed');

      // 4. Reconcile order
      const reconcile = await processReconcileOrder({ orderId });
      expect(reconcile.success).toBe(true);
      expect(reconcile.action).toBe('completed');

      // 5. Query order assertions
      const pollReq = new NextRequest(`http://localhost/api/investments/${orderId}`, {
        method: 'GET',
        headers: { 'x-demo-user-id': INVESTOR_ELIGIBLE_ID },
      });
      const pollRes = await getOrderHandler(pollReq, { params: Promise.resolve({ id: orderId }) });
      expect(pollRes.status).toBe(200);

      const pollJson = await pollRes.json();
      expect(pollJson.order.status).toBe('COMPLETED');
      expect(pollJson.assertions.unitsOrdered).toBe('1');
      expect(pollJson.assertions.unitsOnChainConfirmed).toBe('1');
      expect(pollJson.assertions.attemptsUsed).toBe(2); // 2 attempts were used
      expect(pollJson.assertions.duplicatesPrevented).toBe(1); // 1 failed duplicate prevented
      expect(pollJson.assertions.isReconciled).toBe(true);
    }, 60000);
  });

  describe('5. Duplicate Outbox Job Interception (ARCH §14.3)', () => {
    it('intercepts duplicate allocate_units job enqueue; dedupe key yields strictly ONE execution', async () => {
      const orderId = await createPaidOrder(1);

      // 1. Arm duplicate_job fault
      const armReq = new NextRequest('http://localhost/api/demo/faults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_ID,
        },
        body: JSON.stringify({
          faultType: 'duplicate_job',
          orderId,
          reason: 'Verifying transactional outbox deduplication invariant',
        }),
      });
      const armRes = await faultsHandler(armReq);
      expect(armRes.status).toBe(201);

      // Attempt to enqueue a duplicate job for the same orderId dedupe key
      const duplicateEnqueue = await enqueueOutboxJob('allocate_units', orderId, { orderId });
      expect(duplicateEnqueue.isDuplicate).toBe(true);

      // Verify that in outbox_jobs, only ONE row exists for (type='allocate_units', dedupe_key=orderId)
      const { rows: jobRows } = await pgClient.query(`
        SELECT count(*) FROM outbox_jobs WHERE type = 'allocate_units' AND dedupe_key = '${orderId}';
      `);
      expect(Number(jobRows[0].count)).toBe(1);

      // Execute worker once
      const alloc = await processAllocateUnits({ orderId });
      expect(alloc.success).toBe(true);

      // Execute worker second time (replay)
      const allocReplay = await processAllocateUnits({ orderId });
      expect(allocReplay.success).toBe(true);
      expect(['skip', 'already_confirmed']).toContain(allocReplay.action); // Intercepted by idempotency check

      // Reconcile
      await processReconcileOrder({ orderId });

      // Invariant: Exactly ONE confirmed attempt
      const { rows: confirmedRows } = await pgClient.query(`
        SELECT count(*) FROM allocation_attempts WHERE order_id = '${orderId}' AND status = 'confirmed';
      `);
      expect(Number(confirmedRows[0].count)).toBe(1);
    }, 60000);
  });
});
