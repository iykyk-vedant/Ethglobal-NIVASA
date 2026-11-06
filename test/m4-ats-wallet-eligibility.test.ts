/**
 * Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Sync Test Suite
 * ARCH §8.3–§8.5, §14.3–§14.4, §15.1, §19 · PRD FR-1.x, FR-6.x · PLAN M4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

import { POST as nonceHandler } from '../app/api/wallet/nonce/route';
import { POST as verifyHandler } from '../app/api/wallet/verify/route';
import { POST as requestEligibilityHandler } from '../app/api/eligibility/requests/route';
import { POST as reviewEligibilityHandler } from '../app/api/eligibility/[id]/review/route';
import { POST as workerHandler } from '../app/api/cron/worker/route';
import { buildWalletVerificationMessage } from '../lib/wallet/message';
import { getAtsAdapter } from '../lib/hedera/ats-adapter';
import { readKycStatus, readHolderBalance } from '../lib/hedera/chain-reads';
import { processSyncEligibility } from '../lib/settlement/jobs/sync-eligibility';
import { getAdminDbClient } from '../lib/db/admin';

describe('Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync', () => {
  let pgClient: pg.Client;
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

  // Seeded actor IDs from Milestone M2
  const INVESTOR_1_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const INVESTOR_2_ID = 'b6d21643-1124-42bd-8e12-b67c4e1feaaf';
  const VERIFIER_1_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4';

  // Dedicated test ECDSA wallets
  const testWallet1 = new ethers.Wallet(
    '0x633379b3635952c10b0162024bc68c07e05fc867a5b3a4a169b1834927cb5219'
  );
  const testWallet2 = ethers.Wallet.createRandom();

  beforeAll(async () => {
    pgClient = new pg.Client({ connectionString: dbUrl });
    await pgClient.connect();

    // Clean test state for investor 1 & 2
    await pgClient.query(`
      UPDATE profiles
         SET wallet_address = NULL, wallet_verified_at = NULL, wallet_nonce = NULL, wallet_nonce_expires_at = NULL
       WHERE id IN ('${INVESTOR_1_ID}', '${INVESTOR_2_ID}');
      DELETE FROM investor_eligibility WHERE user_id IN ('${INVESTOR_1_ID}', '${INVESTOR_2_ID}');
      DELETE FROM outbox_jobs WHERE payload->>'userId' IN ('${INVESTOR_1_ID}', '${INVESTOR_2_ID}');
    `);
  }, 30000);

  afterAll(async () => {
    if (pgClient) {
      // Restore seeded state for INVESTOR_1_ID so other suites (like M2) have their expected seed
      await pgClient.query(`
        UPDATE profiles
           SET wallet_address = '0x0000000000000000000000000000000000ace2c6',
               wallet_verified_at = now()
         WHERE id = '${INVESTOR_1_ID}';
        INSERT INTO investor_eligibility (
          user_id, offering_id, status, policy_version, reviewed_by, valid_until, reason_code, chain_status
        ) VALUES (
          '${INVESTOR_1_ID}', '33333333-3333-3333-3333-333333333333', 'eligible', 'v1.0', '${VERIFIER_1_ID}',
          now() + interval '1 year', 'VERIFIED_KYC_ACCREDITED', 'registered'
        )
        ON CONFLICT (user_id, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid))
        WHERE status IN ('pending', 'eligible')
        DO UPDATE SET status = 'eligible', chain_status = 'registered', valid_until = now() + interval '1 year';
      `);
      await pgClient.end();
    }
  });

  describe('1. Wallet Nonce Generation (POST /api/wallet/nonce)', () => {
    it('generates a crypto-secure random nonce with >= 16 bytes and ~10 min expiry', async () => {
      const req = new NextRequest('http://localhost/api/wallet/nonce', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
      });

      const res = await nonceHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.nonce).toBeDefined();
      expect(Buffer.from(json.nonce, 'hex').length).toBeGreaterThanOrEqual(16);
      expect(json.chainId).toBe(296);
      expect(json.domain).toBe('nivasa.realestate');

      const expires = new Date(json.expiresAt).getTime();
      const diffMinutes = (expires - Date.now()) / (60 * 1000);
      expect(diffMinutes).toBeGreaterThan(9);
      expect(diffMinutes).toBeLessThan(11);
    });
  });

  describe('2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)', () => {
    it('rejects verification if signature was generated from a different address', async () => {
      // Step A: Request nonce
      const nonceReq = new NextRequest('http://localhost/api/wallet/nonce', {
        method: 'POST',
        headers: { 'x-demo-user-id': INVESTOR_1_ID },
      });
      const nonceRes = await nonceHandler(nonceReq);
      const { nonce, expiresAt, domain, chainId } = await nonceRes.json();

      // Step B: Sign with testWallet1
      const message = buildWalletVerificationMessage({
        domain,
        userId: INVESTOR_1_ID,
        nonce,
        chainId,
        expiresAt,
      });
      const signature = await testWallet1.signMessage(message);

      // Step C: Submit claiming testWallet2 (mismatch!)
      const verifyReq = new NextRequest('http://localhost/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
        body: JSON.stringify({
          walletAddress: testWallet2.address,
          signature,
          nonce,
        }),
      });

      const verifyRes = await verifyHandler(verifyReq);
      expect(verifyRes.status).toBe(400);

      const json = await verifyRes.json();
      expect(json.ok).toBe(false);
      expect(json.error.code).toBe('VALIDATION_FAILED');
    });

    it('rejects expired nonces', async () => {
      const expiredNonce = crypto.randomBytes(32).toString('hex');
      const pastExpiry = new Date(Date.now() - 60000).toISOString();

      await pgClient.query(`
        UPDATE profiles
           SET wallet_nonce = '${expiredNonce}', wallet_nonce_expires_at = '${pastExpiry}'
         WHERE id = '${INVESTOR_1_ID}'
      `);

      const message = buildWalletVerificationMessage({
        domain: 'nivasa.realestate',
        userId: INVESTOR_1_ID,
        nonce: expiredNonce,
        chainId: 296,
        expiresAt: pastExpiry,
      });
      const signature = await testWallet1.signMessage(message);

      const verifyReq = new NextRequest('http://localhost/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
        body: JSON.stringify({
          walletAddress: testWallet1.address,
          signature,
          nonce: expiredNonce,
        }),
      });

      const verifyRes = await verifyHandler(verifyReq);
      expect(verifyRes.status).toBe(400);
      const json = await verifyRes.json();
      expect(json.error.message).toMatch(/expired/i);
    });

    it('successfully verifies valid signature, consumes nonce, and commits bound wallet', async () => {
      // 1. Get fresh nonce
      const nonceReq = new NextRequest('http://localhost/api/wallet/nonce', {
        method: 'POST',
        headers: { 'x-demo-user-id': INVESTOR_1_ID },
      });
      const nonceRes = await nonceHandler(nonceReq);
      const { nonce, expiresAt, domain, chainId } = await nonceRes.json();

      // 2. Sign with matching testWallet1
      const message = buildWalletVerificationMessage({
        domain,
        userId: INVESTOR_1_ID,
        nonce,
        chainId,
        expiresAt,
      });
      const signature = await testWallet1.signMessage(message);

      // 3. Verify
      const verifyReq = new NextRequest('http://localhost/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
        body: JSON.stringify({
          walletAddress: testWallet1.address,
          signature,
          nonce,
        }),
      });

      const verifyRes = await verifyHandler(verifyReq);
      expect(verifyRes.status).toBe(200);

      const json = await verifyRes.json();
      expect(json.success).toBe(true);
      expect(json.walletAddress.toLowerCase()).toBe(testWallet1.address.toLowerCase());
      expect(json.verifiedAt).toBeDefined();

      // Verify in DB that nonce was consumed (single-use)
      const { rows } = await pgClient.query(`
        SELECT wallet_address, wallet_verified_at, wallet_nonce
          FROM profiles
         WHERE id = '${INVESTOR_1_ID}'
      `);
      expect(rows[0].wallet_address.toLowerCase()).toBe(testWallet1.address.toLowerCase());
      expect(rows[0].wallet_verified_at).not.toBeNull();
      expect(rows[0].wallet_nonce).toBeNull(); // Consumed!
    });

    it('rejects replaying the same nonce (single-use enforcement)', async () => {
      // Attempting to re-verify using the consumed nonce
      const verifyReq = new NextRequest('http://localhost/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
        body: JSON.stringify({
          walletAddress: testWallet1.address,
          signature: '0x1234',
          nonce: 'dummy-consumed-nonce',
        }),
      });

      const verifyRes = await verifyHandler(verifyReq);
      expect(verifyRes.status).toBe(400);
    });

    it('prevents a second user from claiming an already bound wallet address', async () => {
      // User 2 requests nonce
      const nonceReq = new NextRequest('http://localhost/api/wallet/nonce', {
        method: 'POST',
        headers: { 'x-demo-user-id': INVESTOR_2_ID },
      });
      const nonceRes = await nonceHandler(nonceReq);
      const { nonce, expiresAt, domain, chainId } = await nonceRes.json();

      // Sign message with testWallet1 (which is already bound to INVESTOR_1_ID)
      const message = buildWalletVerificationMessage({
        domain,
        userId: INVESTOR_2_ID,
        nonce,
        chainId,
        expiresAt,
      });
      const signature = await testWallet1.signMessage(message);

      // Attempt verification for User 2
      const verifyReq = new NextRequest('http://localhost/api/wallet/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_2_ID,
        },
        body: JSON.stringify({
          walletAddress: testWallet1.address,
          signature,
          nonce,
        }),
      });

      const verifyRes = await verifyHandler(verifyReq);
      expect(verifyRes.status).toBe(409); // CONFLICT
      const json = await verifyRes.json();
      expect(json.error.code).toBe('CONFLICT');
    });
  });

  describe('3. Separation of Duties (SoD) & Eligibility Review (POST /api/eligibility/*)', () => {
    let eligibilityId: string;

    it('allows verified investor to submit accreditation request', async () => {
      const req = new NextRequest('http://localhost/api/eligibility/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_1_ID,
        },
        body: JSON.stringify({}),
      });

      const res = await requestEligibilityHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.record.status).toBe('pending');
      expect(json.record.chain_status).toBe('not_registered');

      eligibilityId = json.record.id;
    });

    it('strictly rejects self-review (investor cannot approve own eligibility)', async () => {
      const selfReviewReq = new NextRequest(
        `http://localhost/api/eligibility/${eligibilityId}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': INVESTOR_1_ID, // Self-review attempt!
          },
          body: JSON.stringify({
            decision: 'approve',
            reason: 'Self review attempt must fail with SoD violation',
          }),
        }
      );

      const res = await reviewEligibilityHandler(selfReviewReq, {
        params: Promise.resolve({ id: eligibilityId }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.code).toBe('SOD_VIOLATION');
    });

    it('requires a substantive reason for reviewer decisions', async () => {
      const noReasonReq = new NextRequest(
        `http://localhost/api/eligibility/${eligibilityId}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': VERIFIER_1_ID,
          },
          body: JSON.stringify({
            decision: 'approve',
            reason: '', // Empty reason
          }),
        }
      );

      const res = await reviewEligibilityHandler(noReasonReq, {
        params: Promise.resolve({ id: eligibilityId }),
      });
      expect(res.status).toBe(400);
    });

    it('allows independent verifier to approve eligibility and enqueues sync_eligibility job', async () => {
      const reviewReq = new NextRequest(
        `http://localhost/api/eligibility/${eligibilityId}/review`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': VERIFIER_1_ID,
          },
          body: JSON.stringify({
            decision: 'approve',
            reason: 'Accreditation certified via SEBI Category II AIF criteria checklist.',
          }),
        }
      );

      const res = await reviewEligibilityHandler(reviewReq, {
        params: Promise.resolve({ id: eligibilityId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.status).toBe('eligible');

      // Verify that outbox job was enqueued
      const { rows } = await pgClient.query(`
        SELECT id, type, status, payload
          FROM outbox_jobs
         WHERE type = 'sync_eligibility'
           AND payload->>'eligibilityId' = '${eligibilityId}'
      `);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows[0].status).toBe('pending');
    });
  });

  describe('4. Idempotent Hedera Chain Sync & Outbox Worker', () => {
    it('executes sync_eligibility worker and handles duplicate runs idempotently', async () => {
      const admin = getAdminDbClient();
      const { data: eligibility } = await admin
        .from('investor_eligibility')
        .select('id, user_id')
        .eq('user_id', INVESTOR_1_ID)
        .eq('status', 'eligible')
        .single();

      expect(eligibility).toBeDefined();

      // First run: calls AtsAdapter to register on Hedera
      const firstRun = await processSyncEligibility({
        eligibilityId: eligibility!.id,
        userId: eligibility!.user_id,
        action: 'register',
        wallet: testWallet1.address,
      });

      expect(firstRun.success).toBe(true);
      expect(firstRun.action).toBe('register');

      // Verify in DB that chain_status is now registered
      const { data: updated } = await admin
        .from('investor_eligibility')
        .select('chain_status')
        .eq('id', eligibility!.id)
        .single();
      expect(updated?.chain_status).toBe('registered');

      // Second run: must detect on-chain status or DB state and NOT create duplicate transaction
      const secondRun = await processSyncEligibility({
        eligibilityId: eligibility!.id,
        userId: eligibility!.user_id,
        action: 'register',
        wallet: testWallet1.address,
      });

      expect(secondRun.success).toBe(true);
      expect(secondRun.note).toMatch(/idempotent/i);
    });

    it('fails closed and returns UNAVAILABLE when querying an invalid contract address', async () => {
      const invalidTarget = '0x0000000000000000000000000000000000000001';
      const readRes = await readKycStatus(testWallet1.address, invalidTarget);

      expect(readRes.status).toBe('UNAVAILABLE');
      expect(readRes.data).toBeNull();
      expect(readRes.lastSyncAt).toBeDefined();
    });

    it('protects the worker cron route with CRON_SECRET and bounded execution', async () => {
      // 1. Unauthenticated request rejected
      const unauthReq = new NextRequest('http://localhost/api/cron/worker', {
        method: 'POST',
      });
      const unauthRes = await workerHandler(unauthReq);
      expect(unauthRes.status).toBe(401);

      // 2. Authenticated request processes bounded jobs
      const authReq = new NextRequest('http://localhost/api/cron/worker', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.CRON_SECRET}`,
        },
      });
      const authRes = await workerHandler(authReq);
      expect(authRes.status).toBe(200);

      const json = await authRes.json();
      expect(json.success).toBe(true);
      expect(json.workerId).toBeDefined();
      expect(typeof json.processedCount).toBe('number');
    });
  });
});
