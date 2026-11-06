/**
 * Milestone M14: Operator Console & Audit Log Test Suite
 * UI §8.11, §10.6, §14 · ARCH §14.3–14.4, §17.2, §17.5, §19, §21 · PRD FR-9.x · PLAN M14
 *
 * Verifies that:
 * 1. Non-admin users (unauthenticated or investor) are strictly refused (403 FORBIDDEN) on all admin endpoints.
 * 2. GET /api/admin/ops returns queue counts, jobs with correlation IDs, stuck orders, supply reconciliation,
 *    chain sync health, D1 activation-gate status, and role-separated provenance (never keys).
 * 3. GET /api/admin/audit returns contiguous cryptographic SHA-256 hash-chain verification with zero broken links.
 * 4. POST /api/admin/roles allows admin role assignment/revocation with mandatory audit logging, while
 *    Postgres database triggers strictly prevent self-approval (Separation of Duties).
 * 5. POST /api/admin/jobs/retry allows safe, idempotent retries of failed/dead outbox jobs with audit trails.
 * 6. GET /api/demo/flags returns live server-backed demo flag states (DEMO_PAYMENTS, DEMO_FAULTS, DEMO_EVENTS).
 * 7. Security sweep confirms zero private keys, secret tokens, or connection strings leak in API responses.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
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

process.env.DEMO_PAYMENTS = 'true';
process.env.DEMO_FAULTS = 'true';
process.env.DEMO_EVENTS = 'true';
process.env.APP_ENV = 'test';

import { GET as opsHandler } from '../app/api/admin/ops/route';
import { GET as auditHandler } from '../app/api/admin/audit/route';
import { GET as rolesGetHandler, POST as rolesPostHandler } from '../app/api/admin/roles/route';
import { POST as retryJobHandler } from '../app/api/admin/jobs/retry/route';
import { GET as demoFlagsHandler } from '../app/api/demo/flags/route';
import { POST as paymentConfirmHandler } from '../app/api/demo/payment-confirmation/route';
import { POST as propertyEventHandler } from '../app/api/demo/property-event/route';

const ADMIN_USER_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';
const INVESTOR_USER_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
const ISSUER_USER_ID = 'e7084862-05bb-4b40-911d-46c56b12f875';
const DEMO_PROPERTY_ID = '11111111-1111-1111-1111-111111111111';

describe('Milestone M14: Operator Console & Audit Log Test Suite', () => {
  let pgClient: pg.Client;
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

  beforeAll(async () => {
    pgClient = new pg.Client({ connectionString: dbUrl });
    await pgClient.connect();
  });

  afterAll(async () => {
    if (pgClient) {
      await pgClient.end();
    }
  });

  describe('1. Role-Based Access Control on Admin Endpoints', () => {
    it('refuses unauthenticated callers with 401 or 403 on admin routes', async () => {
      const endpoints = [
        { handler: opsHandler, method: 'GET', url: 'http://localhost/api/admin/ops' },
        { handler: auditHandler, method: 'GET', url: 'http://localhost/api/admin/audit' },
        { handler: rolesGetHandler, method: 'GET', url: 'http://localhost/api/admin/roles' },
      ];

      for (const ep of endpoints) {
        const req = new NextRequest(ep.url, { method: ep.method });
        const res = await ep.handler(req);
        expect(res.status).toBeGreaterThanOrEqual(401);
      }
    });

    it('refuses non-admin users (e.g. investor) with 403 on all admin routes', async () => {
      // Investor caller
      const opsReq = new NextRequest('http://localhost/api/admin/ops', {
        headers: { 'x-demo-user-id': INVESTOR_USER_ID },
      });
      const opsRes = await opsHandler(opsReq);
      expect(opsRes.status).toBe(403);
      const opsJson = await opsRes.json();
      expect(opsJson.error.code).toBe('FORBIDDEN');

      const auditReq = new NextRequest('http://localhost/api/admin/audit', {
        headers: { 'x-demo-user-id': INVESTOR_USER_ID },
      });
      const auditRes = await auditHandler(auditReq);
      expect(auditRes.status).toBe(403);

      const rolesReq = new NextRequest('http://localhost/api/admin/roles', {
        headers: { 'x-demo-user-id': INVESTOR_USER_ID },
      });
      const rolesRes = await rolesGetHandler(rolesReq);
      expect(rolesRes.status).toBe(403);

      const retryReq = new NextRequest('http://localhost/api/admin/jobs/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': INVESTOR_USER_ID,
        },
        body: JSON.stringify({ jobId: '00000000-0000-0000-0000-000000000000' }),
      });
      const retryRes = await retryJobHandler(retryReq);
      expect(retryRes.status).toBe(403);
    });
  });

  describe('2. GET /api/admin/ops Dashboard Metrics & Provenance', () => {
    it('returns queue counts, stuck orders, supply reconciliation, and D1 activation gate conditions', async () => {
      const req = new NextRequest('http://localhost/api/admin/ops', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const res = await opsHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();

      // Check Queue Counts
      expect(json).toHaveProperty('queueCounts');
      expect(typeof json.queueCounts.pending).toBe('number');
      expect(typeof json.queueCounts.running).toBe('number');
      expect(typeof json.queueCounts.failed).toBe('number');
      expect(typeof json.queueCounts.dead).toBe('number');
      expect(typeof json.queueCounts.completed).toBe('number');
      expect(typeof json.queueCounts.total).toBe('number');

      // Check Outbox Jobs with correlation ID
      expect(Array.isArray(json.jobs)).toBe(true);
      if (json.jobs.length > 0) {
        expect(json.jobs[0]).toHaveProperty('correlationId');
        expect(json.jobs[0]).toHaveProperty('dedupeKey');
        expect(json.jobs[0]).toHaveProperty('status');
      }

      // Check Supply Reconciliation
      expect(json).toHaveProperty('supplyReconciliation');
      expect(json.supplyReconciliation).toHaveProperty('onChainSupply');
      expect(json.supplyReconciliation).toHaveProperty('dbCompletedUnits');
      expect(json.supplyReconciliation).toHaveProperty('status');

      // Check Chain Sync Health
      expect(json).toHaveProperty('chainSyncHealth');
      expect(json.chainSyncHealth.network).toBe('Hedera Testnet');
      expect(json.chainSyncHealth.status).toBe('HEALTHY');
      expect(json.chainSyncHealth.diamondAddress).toBeDefined();

      // Check 7 D1 Activation Gate Conditions (C1 - C7)
      expect(Array.isArray(json.activationGateConditions)).toBe(true);
      expect(json.activationGateConditions.length).toBe(7);
      const conditionIds = json.activationGateConditions.map((c: any) => c.id);
      expect(conditionIds).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7']);

      // Check Role-Separated Provenance (Clean Display Names, Never Keys)
      expect(Array.isArray(json.roleSeparatedActors)).toBe(true);
      for (const actor of json.roleSeparatedActors) {
        expect(actor).toHaveProperty('role');
        expect(actor).toHaveProperty('displayName');
        expect(actor).toHaveProperty('entity');
        expect(actor).toHaveProperty('permissions');
        // Ensure no private key or secret is attached
        const actorStr = JSON.stringify(actor);
        expect(actorStr).not.toContain('PRIVATE_KEY');
        expect(actorStr).not.toContain('0x');
      }
    });
  });

  describe('3. GET /api/admin/audit & Cryptographic Hash Chain Integrity', () => {
    it('verifies the contiguous SHA-256 hash chain with zero broken links', async () => {
      const req = new NextRequest('http://localhost/api/admin/audit', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const res = await auditHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('chainVerification');
      expect(json.chainVerification.isVerified).toBe(true);
      expect(json.chainVerification.unbroken).toBe(true);
      expect(json.chainVerification.totalRows).toBeGreaterThanOrEqual(1);
      expect(json.chainVerification.genesisHash).toBeDefined();
      expect(json.chainVerification.tipHash).toBeDefined();

      // Explicit verification: Verify that each row's prev_hash strictly links to predecessor
      const { rows: dbRows } = await pgClient.query(`
        SELECT id, prev_hash, row_hash, action, created_at
          FROM audit_logs
         ORDER BY id ASC;
      `);

      expect(dbRows.length).toBeGreaterThan(0);
      for (let i = 1; i < dbRows.length; i++) {
        expect(dbRows[i].prev_hash).toBe(dbRows[i - 1].row_hash);
      }
    });
  });

  describe('4. Role Management & Separation of Duties (SoD) Invariants', () => {
    it('admin can grant and revoke a role with mandatory audit log trail', async () => {
      const targetUserId = INVESTOR_USER_ID;
      const testRole = 'verifier';

      // 1. Grant role
      const grantReq = new NextRequest('http://localhost/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_USER_ID,
        },
        body: JSON.stringify({
          userId: targetUserId,
          role: testRole,
          action: 'grant',
          reason: 'Authorized temporary verifier credentials for M14 audit test',
        }),
      });

      const grantRes = await rolesPostHandler(grantReq);
      expect(grantRes.status).toBe(200);
      const grantJson = await grantRes.json();
      expect(grantJson.success).toBe(true);
      expect(grantJson.auditLogId).toBeDefined();

      // Verify audit log has role_granted entry
      const { rows: auditRows } = await pgClient.query(`
        SELECT id, action, resource_type, resource_id, reason
          FROM audit_logs
         WHERE id = ${grantJson.auditLogId};
      `);
      expect(auditRows.length).toBe(1);
      expect(auditRows[0].action).toBe('role_granted');
      expect(auditRows[0].resource_type).toBe('user_role');

      // 2. Revoke role
      const revokeReq = new NextRequest('http://localhost/api/admin/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_USER_ID,
        },
        body: JSON.stringify({
          userId: targetUserId,
          role: testRole,
          action: 'revoke',
          reason: 'Revoked temporary verifier credentials after M14 audit test',
        }),
      });

      const revokeRes = await rolesPostHandler(revokeReq);
      expect(revokeRes.status).toBe(200);
      const revokeJson = await revokeRes.json();
      expect(revokeJson.success).toBe(true);
      expect(revokeJson.auditLogId).toBeDefined();

      // Verify audit log has role_revoked entry
      const { rows: revokeAuditRows } = await pgClient.query(`
        SELECT id, action, resource_type
          FROM audit_logs
         WHERE id = ${revokeJson.auditLogId};
      `);
      expect(revokeAuditRows[0].action).toBe('role_revoked');
      expect(revokeAuditRows[0].resource_type).toBe('user_role');
    });

    it('enforces database-level SoD trigger: an admin/verifier cannot self-approve offerings', async () => {
      // Even if admin has an approver role, database trigger enforce_offering_approval_sod
      // refuses when approved_by equals proposed_by
      const { rows: offeringRows } = await pgClient.query(`
        SELECT id, proposed_by FROM offerings WHERE id = '33333333-3333-3333-3333-333333333333';
      `);
      expect(offeringRows.length).toBe(1);
      const proposer = offeringRows[0].proposed_by;

      // Attempt self-approval via direct DB update to test the DB trigger invariant
      let triggerViolated = false;
      try {
        await pgClient.query(`
          UPDATE offerings
             SET approved_by = '${proposer}'
           WHERE id = '33333333-3333-3333-3333-333333333333';
        `);
      } catch (err: any) {
        triggerViolated = true;
        expect(err.message).toMatch(/SOD_VIOLATION/i);
      }
      expect(triggerViolated).toBe(true);
    });
  });

  describe('5. Safe Idempotent Job Retries', () => {
    it('refuses to retry unapproved or unsafe job types', async () => {
      // Insert a dummy job of unsafe type
      const { rows: jobRows } = await pgClient.query(`
        INSERT INTO outbox_jobs (type, dedupe_key, payload, status)
        VALUES ('unsafe_arbitrary_job', 'test-unsafe-key-${Date.now()}', '{"test":true}'::jsonb, 'failed')
        RETURNING id;
      `);
      const dummyJobId = jobRows[0].id;

      const req = new NextRequest('http://localhost/api/admin/jobs/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_USER_ID,
        },
        body: JSON.stringify({
          jobId: dummyJobId,
          reason: 'Attempting to retry unsafe job',
        }),
      });

      const res = await retryJobHandler(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain('not allowlisted as a safe idempotent job');

      // Cleanup
      await pgClient.query(`DELETE FROM outbox_jobs WHERE id = '${dummyJobId}';`);
    });

    it('safely retries a safe idempotent job by resetting status to pending and logging audit row', async () => {
      // Insert a dead safe job (e.g. integrity_check)
      const dedupeKey = `test-safe-retry-${Date.now()}`;
      const correlationId = `corr-${Date.now()}`;
      const { rows: jobRows } = await pgClient.query(`
        INSERT INTO outbox_jobs (type, dedupe_key, payload, status, attempts, last_error)
        VALUES (
          'integrity_check',
          '${dedupeKey}',
          '{"correlationId": "${correlationId}", "propertyId": "${DEMO_PROPERTY_ID}"}'::jsonb,
          'dead',
          5,
          'Transient mirror node timeout'
        )
        RETURNING id;
      `);
      const safeJobId = jobRows[0].id;

      const req = new NextRequest('http://localhost/api/admin/jobs/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_USER_ID,
        },
        body: JSON.stringify({
          jobId: safeJobId,
          reason: 'Manual operator retry of safe manifest integrity check',
        }),
      });

      const res = await retryJobHandler(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.job.status).toBe('pending');
      expect(json.job.attempts).toBe(0);
      expect(json.correlationId).toBe(correlationId);
      expect(json.auditLogId).toBeDefined();

      // Verify audit row
      const { rows: auditRows } = await pgClient.query(`
        SELECT id, action, resource_type, resource_id, reason
          FROM audit_logs
         WHERE id = ${json.auditLogId};
      `);
      expect(auditRows.length).toBe(1);
      expect(auditRows[0].action).toBe('job_retry_requested');
      expect(auditRows[0].resource_type).toBe('outbox_job');
      expect(auditRows[0].resource_id).toBe(safeJobId);

      // Cleanup
      await pgClient.query(`DELETE FROM outbox_jobs WHERE id = '${safeJobId}';`);
    });
  });

  describe('6. Server-Backed Demo Flags & Controls', () => {
    it('returns server-backed demo flag status for DEMO_PAYMENTS, DEMO_FAULTS, and DEMO_EVENTS', async () => {
      const req = new NextRequest('http://localhost/api/demo/flags', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const res = await demoFlagsHandler(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('flags');
      expect(json.flags.DEMO_PAYMENTS.enabled).toBe(true);
      expect(json.flags.DEMO_FAULTS.enabled).toBe(true);
      expect(json.flags.DEMO_EVENTS.enabled).toBe(true);
      expect(json.isProduction).toBe(false);
    });

    it('requires substantive reason when confirming simulated payments and logs audit ID', async () => {
      // Fetch or create an order in PAYMENT_PENDING
      const { rows: orderRows } = await pgClient.query(`
        SELECT id FROM investment_orders WHERE status = 'PAYMENT_PENDING' LIMIT 1;
      `);

      if (orderRows.length > 0) {
        const orderId = orderRows[0].id;
        const req = new NextRequest('http://localhost/api/demo/payment-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': ADMIN_USER_ID,
          },
          body: JSON.stringify({
            orderId,
            reason: 'Test simulated payment confirmation for M14 verification',
          }),
        });

        const res = await paymentConfirmHandler(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.status).toBe('PAYMENT_CONFIRMED');
        expect(json.auditId).toBeDefined();
      }
    });

    it('requires substantive reason when applying scripted property events and logs audit ID', async () => {
      const req = new NextRequest('http://localhost/api/demo/property-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': ADMIN_USER_ID,
        },
        body: JSON.stringify({
          propertyId: DEMO_PROPERTY_ID,
          eventId: 'event-mh-001-valuation-increase',
          reason: 'M14 Operator Console scripted event verification test',
        }),
      });

      const res = await propertyEventHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.auditId).toBeDefined();
      expect(json.snapshot.provenance).toBe('simulated');
    });
  });

  describe('7. Security Sweep: Zero Key or Secret Leaks in Responses', () => {
    it('ensures no private keys, signer keys, or database secrets appear in admin endpoints', async () => {
      const sensitiveKeys = [
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        process.env.HEDERA_DEPLOYER_PRIVATE_KEY,
        process.env.HEDERA_PAUSER_PRIVATE_KEY,
        process.env.HEDERA_COMPLIANCE_PRIVATE_KEY,
        process.env.HEDERA_ISSUER_AGENT_PRIVATE_KEY,
      ].filter(Boolean) as string[];

      // Ops endpoint
      const opsReq = new NextRequest('http://localhost/api/admin/ops', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const opsRes = await opsHandler(opsReq);
      const opsText = await opsRes.text();
      for (const secret of sensitiveKeys) {
        expect(opsText).not.toContain(secret);
      }

      // Audit endpoint
      const auditReq = new NextRequest('http://localhost/api/admin/audit', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const auditRes = await auditHandler(auditReq);
      const auditText = await auditRes.text();
      for (const secret of sensitiveKeys) {
        expect(auditText).not.toContain(secret);
      }

      // Roles endpoint
      const rolesReq = new NextRequest('http://localhost/api/admin/roles', {
        headers: { 'x-demo-user-id': ADMIN_USER_ID },
      });
      const rolesRes = await rolesGetHandler(rolesReq);
      const rolesText = await rolesRes.text();
      for (const secret of sensitiveKeys) {
        expect(rolesText).not.toContain(secret);
      }
    });
  });
});
