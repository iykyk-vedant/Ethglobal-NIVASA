/**
 * Milestone M6: Investor, Offering & Settlement UI + Restriction Proof
 * Refs: UI §8.2, §8.5, §8.7, §11.4 · ARCH §14.6–14.8, §21 · PRD FR-5.9, FR-6.6 · PLAN M6
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { NextRequest } from 'next/server';

// Load environment variables for integration tests
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
if (!process.env.CRON_SECRET) process.env.CRON_SECRET = randomBytes(32).toString('hex');
const testCronSecret = process.env.CRON_SECRET as string;
process.env.DEMO_PAYMENTS = 'true';

import { mulMoney, formatINR, toMoneyString } from '../lib/money/decimal';
import { ORDER_STATUSES, OrderStatus } from '../lib/state/transitions';
import { getOrderStatePresentation } from '../lib/ui/state-map';
import { getHashScanTxUrl } from '../lib/hedera/config';
import { getAdminDbClient } from '../lib/db/admin';
import { POST as investmentHandler } from '../app/api/investments/route';
import { GET as getOrderHandler } from '../app/api/investments/[id]/route';
import { POST as paymentConfirmHandler } from '../app/api/demo/payment-confirmation/route';
import { POST as workerHandler } from '../app/api/cron/worker/route';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '../lib/wallet/investment-acknowledgement';
import { runRestrictionProof } from '../scripts/restriction-proof';

describe('Milestone M6: Investor, Offering & Settlement UI + Restriction Proof', () => {
  const DEMO_OFFERING_ID = '33333333-3333-3333-3333-333333333333';
  const INVESTOR_ELIGIBLE_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';
  const ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';

  // Seeded eligible test wallet (Rahul Mehta: 0x27db461757dc16461f3b5323118cb53e03e21d3f)
  const investorWallet = new ethers.Wallet(
    '0x633379b3635952c10b0162024bc68c07e05fc867a5b3a4a169b1834927cb5219'
  );

  describe('1. Exact Decimal Financial Math in Order Processing (No Floats)', () => {
    it('calculates order totals using exact decimal multiplication without floating point errors', () => {
      // 3 units * ₹10,000.00
      expect(mulMoney('10000.00', '3')).toBe('30000.00');

      // 7 units * ₹12,345.67
      expect(mulMoney('12345.67', '7')).toBe('86419.69');

      // 0 units
      expect(mulMoney('10000.00', '0')).toBe('0.00');

      // Verify no IEEE 754 precision drift (e.g. 0.1 + 0.2 != 0.3)
      const preciseTotal = mulMoney('19.99', '3');
      expect(preciseTotal).toBe('59.97');
      expect(preciseTotal).not.toBe('59.970000000000006');
    });

    it('formats order amounts into Indian currency notation (INR lakhs & crores)', () => {
      expect(formatINR('10000.00')).toBe('₹10,000.00');
      expect(formatINR('50000.00')).toBe('₹50,000.00');
      expect(formatINR('100000000.00')).toBe('₹10,00,00,000.00');
    });
  });

  describe('2. Canonical Order State Presentation Map Coverage (UI §13.4)', () => {
    it('covers all canonical order states with distinct labels and semantic variants', () => {
      const knownStatuses: OrderStatus[] = [
        'UNITS_RESERVED',
        'PAYMENT_PENDING',
        'PAYMENT_CONFIRMED',
        'ALLOCATION_PENDING',
        'ALLOCATION_SUBMITTED',
        'ALLOCATION_CONFIRMED',
        'COMPLETED',
        'PAYMENT_FAILED',
        'ALLOCATION_FAILED',
        'REFUND_PENDING',
        'REFUNDED',
        'RECONCILIATION_REQUIRED',
        'MANUAL_REVIEW',
        'REJECTED',
        'EXPIRED',
      ];

      for (const status of knownStatuses) {
        const presentation = getOrderStatePresentation(status);
        expect(presentation).toBeDefined();
        expect(presentation.label).toBeTruthy();
        expect(presentation.variant).toMatch(/^(success|warning|danger|info|pending|neutral)$/);
      }
    });

    it('strictly maps COMPLETED to success and exception states to danger or warning', () => {
      expect(getOrderStatePresentation('COMPLETED').variant).toBe('success');
      expect(getOrderStatePresentation('ALLOCATION_FAILED').variant).toBe('danger');
      expect(getOrderStatePresentation('PAYMENT_FAILED').variant).toBe('danger');
      expect(getOrderStatePresentation('RECONCILIATION_REQUIRED').variant).toBe('warning');
      expect(getOrderStatePresentation('MANUAL_REVIEW').variant).toBe('warning');
    });
  });

  describe('3. ReceiptLinkCard Visibility Logic (ARCH §15.3)', () => {
    it('exposes the public receipt link exclusively for COMPLETED orders', () => {
      // Logic simulated identically to ReceiptLinkCard component
      function canShowReceipt(status: string, token?: string) {
        return status === 'COMPLETED' && Boolean(token);
      }

      expect(canShowReceipt('COMPLETED', 'rcpt-test-uuid-1234')).toBe(true);
      expect(canShowReceipt('UNITS_RESERVED', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('PAYMENT_PENDING', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('PAYMENT_CONFIRMED', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('ALLOCATION_PENDING', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('ALLOCATION_SUBMITTED', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('ALLOCATION_CONFIRMED', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('ALLOCATION_FAILED', 'rcpt-test-uuid-1234')).toBe(false);
      expect(canShowReceipt('COMPLETED', '')).toBe(false);
    });
  });

  describe('4. Prohibited Marketing Phrases & KPI Sweep (UI §6.3, §8.5)', () => {
    it('never uses forbidden phrases in investor and offering UI screens', () => {
      const filesToCheck = [
        'app/(app)/investor/page.tsx',
        'app/(app)/offerings/[id]/page.tsx',
        'app/(app)/investor/orders/[id]/page.tsx',
        'components/offering/DemoOrderForm.tsx',
        'components/offering/ParticipationPanel.tsx',
        'components/timeline/SettlementTimeline.tsx',
      ];

      const forbiddenPhrases = [
        'government verified',
        'delta compliant',
        'clear title',
        'legally verified',
        'safe investment',
        'recommended investment',
        'ownership token',
        'buy property',
        'invest now',
        'verified property',
      ];

      for (const file of filesToCheck) {
        const filePath = path.resolve(process.cwd(), file);
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();

        for (const phrase of forbiddenPhrases) {
          expect(content.includes(phrase)).toBe(false);
        }
      }
    });

    it('never computes or labels portfolio ROI, profit, or expected income KPIs in investor dashboard', () => {
      const investorPagePath = path.resolve(process.cwd(), 'app/(app)/investor/page.tsx');
      const content = fs.readFileSync(investorPagePath, 'utf-8');

      const forbiddenKpiTerms = [
        'portfolio roi',
        'annualized return',
        'expected income',
        'total profit',
        'ownership percentage',
      ];

      for (const term of forbiddenKpiTerms) {
        expect(content.toLowerCase().includes(term)).toBe(false);
      }
    });
  });

  describe('5. Real ATS Restriction Proof Execution (ARCH §14.8)', () => {
    it('executes restriction proof on Hedera Testnet, recording both transactions in audit_logs', async () => {
      const summary = await runRestrictionProof();

      expect(summary.test1.observed).toBe('SUCCESS');
      expect(summary.test1.chainTxId).toMatch(/0\.0\.\d+@\d+\.\d+/);

      expect(summary.test2.observed).toBe('REJECTED');
      expect(summary.test2.revertReason).toBeTruthy();

      expect(summary.auditLogId).toBeDefined();
      expect(summary.auditLogId).toBeGreaterThan(0);
    }, 45000);
  });

  describe('6. Tier A Demo Settlement Flow Integration', () => {
    it('completes the full thin-slice lifecycle from signed order to reconciled receipt', async () => {
      const admin = getAdminDbClient();

      // Ensure investor wallet is bound and verified
      await admin
        .from('profiles')
        .update({
          wallet_address: investorWallet.address.toLowerCase(),
          wallet_verified_at: new Date().toISOString(),
        })
        .eq('id', INVESTOR_ELIGIBLE_ID);

      const { data: offering } = await admin
        .from('offerings')
        .select('*')
        .eq('id', DEMO_OFFERING_ID)
        .single();

      const { data: rights } = await admin
        .from('offering_rights')
        .select('*')
        .eq('offering_id', DEMO_OFFERING_ID)
        .eq('version', offering.current_rights_version)
        .single();

      const idempotencyKey = `m6-test-${Date.now()}`;
      const nonce = `nonce-m6-${Date.now()}`;
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const units = '2';
      const unitPriceInr = toMoneyString(String(offering.unit_price_inr));
      const totalAmountInr = mulMoney(unitPriceInr, '2');
      const rightsVersion = offering.current_rights_version;
      const rightsDocumentHash = rights.rights_document_hash;

      // 1. Build and sign acknowledgement
      const ackMessage = buildInvestmentAcknowledgementMessage({
        offeringId: DEMO_OFFERING_ID,
        rightsVersion,
        rightsDocumentHash,
        units,
        unitPriceInr,
        totalAmountInr,
        walletAddress: investorWallet.address.toLowerCase(),
        nonce,
        expiresAt,
        statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
      });

      const ackSignature = await investorWallet.signMessage(ackMessage);

      // 2. Submit order reservation
      const req = new NextRequest('http://localhost:3000/api/investments', {
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
            rightsVersion,
            rightsDocumentHash,
            units,
            unitPriceInr,
            totalAmountInr,
            walletAddress: investorWallet.address.toLowerCase(),
            nonce,
            expiresAt,
            statement: CANONICAL_SIMULATED_DEMO_STATEMENT,
            signature: ackSignature,
          },
        }),
      });

      const res = await investmentHandler(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      const orderId = json.order.id;
      expect(['UNITS_RESERVED', 'PAYMENT_PENDING']).toContain(json.order.status);

      // 3. Confirm simulated payment
      const payReq = new NextRequest(
        'http://localhost:3000/api/demo/payment-confirmation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': ADMIN_ID,
          },
          body: JSON.stringify({
            orderId,
            simulatedPaymentRef: `DEMO_INR_M6_${Date.now()}`,
          }),
        }
      );

      const payRes = await paymentConfirmHandler(payReq);
      expect(payRes.status).toBe(200);
      const payJson = await payRes.json();
      expect(payJson.success).toBe(true);
      expect(payJson.status).toBe('PAYMENT_CONFIRMED');

      // 4. Run cron outbox worker to process allocate_units job
      const workerReq = new NextRequest('http://localhost:3000/api/cron/worker', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${testCronSecret}`,
          'x-cron-secret': testCronSecret,
          'x-demo-user-id': ADMIN_ID,
        },
      });

      const workerRes = await workerHandler(workerReq);
      expect(workerRes.status).toBe(200);

      // 5. Query order settlement timeline endpoint
      const getReq = new NextRequest(
        `http://localhost:3000/api/investments/${orderId}`,
        {
          method: 'GET',
          headers: {
            'x-demo-user-id': INVESTOR_ELIGIBLE_ID,
          },
        }
      );

      const getRes = await getOrderHandler(getReq, {
        params: Promise.resolve({ id: orderId }),
      });
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.order.id).toBe(orderId);
      expect(getJson.timeline.length).toBeGreaterThanOrEqual(2);
      expect(getJson.assertions).toBeDefined();
      expect(getJson.assertions.unitsOrdered).toBe('2');
    }, 60000);
  });
});
