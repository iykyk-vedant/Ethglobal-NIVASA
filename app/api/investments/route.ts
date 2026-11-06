/**
 * POST /api/investments
 * ARCH §14.1, §15.2, §17.4 · PRD FR-5.1 · PLAN M5.1
 *
 * Investor order reservation endpoint:
 * - Requires Idempotency-Key header
 * - Requires signed acknowledgement message
 * - Reconstructs and verifies exact terms against DB (offering, rights, price, wallet)
 * - Verifies EIP-191 signature matches bound wallet
 * - Calls atomic reserve_units RPC in PostgreSQL (with offering row-lock)
 * - Maps DB exceptions to stable error codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ethers } from 'ethers';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient } from '@/lib/db/admin';
import { reserveUnitsRpc } from '@/lib/db/admin';
import {
  AppError,
  ErrorCodes,
  formatErrorResponse,
} from '@/lib/validation/errors';
import {
  buildInvestmentAcknowledgementMessage,
  CANONICAL_SIMULATED_DEMO_STATEMENT,
} from '@/lib/wallet/investment-acknowledgement';
import { multiplyMoney, toUnitsString } from '@/lib/money/decimal';

const acknowledgementSchema = z.object({
  offeringId: z.string().uuid('Invalid offering ID'),
  rightsVersion: z.number().int().positive('Rights version must be positive integer'),
  rightsDocumentHash: z.string().min(1, 'Rights document hash required'),
  units: z.string().regex(/^[1-9]\d*$/, 'Units must be positive integer string'),
  unitPriceInr: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Unit price must be numeric string'),
  totalAmountInr: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Total amount must be numeric string'),
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid wallet address'),
  nonce: z.string().min(1, 'Nonce required'),
  expiresAt: z.string().min(1, 'Expiry required'),
  statement: z.string().min(1, 'Disclaimer statement required'),
  signature: z.string().min(1, 'Signature required'),
});

const createOrderSchema = z.object({
  offeringId: z.string().uuid('Invalid offering ID format'),
  units: z.union([
    z.number().int().positive(),
    z.string().regex(/^[1-9]\d*$/),
  ]),
  acknowledgement: acknowledgementSchema,
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['investor', 'admin']);
    const idempotencyKey =
      req.headers.get('idempotency-key') ||
      req.headers.get('Idempotency-Key') ||
      '';

    if (!idempotencyKey.trim()) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Idempotency-Key header is required for investment orders.',
        400
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = createOrderSchema.parse(body);
    const unitsStr = validated.units.toString();
    const admin = getAdminDbClient();

    // 1. Fetch investor profile to check verified wallet
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, wallet_address, wallet_verified_at')
      .eq('id', auth.userId)
      .single();

    if (profileErr || !profile) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Investor profile not found.', 404);
    }

    if (!profile.wallet_address || !profile.wallet_verified_at) {
      throw new AppError(
        ErrorCodes.WALLET_NOT_VERIFIED,
        'Wallet must be verified before reserving units.',
        400
      );
    }

    // 2. Fetch offering details
    const { data: offering, error: offeringErr } = await admin
      .from('offerings')
      .select('*')
      .eq('id', validated.offeringId)
      .single();

    if (offeringErr || !offering) {
      throw new AppError(ErrorCodes.OFFERING_NOT_FOUND, 'Offering not found.', 404);
    }

    if (offering.status === 'paused_evidence_drift') {
      throw new AppError(
        ErrorCodes.OFFERING_PAUSED_EVIDENCE,
        'Offering is paused due to evidence drift.',
        409
      );
    }

    if (offering.status !== 'active') {
      throw new AppError(
        ErrorCodes.OFFERING_NOT_ACTIVE,
        `Offering is not active (current status: ${offering.status}).`,
        409
      );
    }

    // 3. Fetch active offering rights version
    const { data: rights, error: rightsErr } = await admin
      .from('offering_rights')
      .select('*')
      .eq('offering_id', offering.id)
      .eq('version', offering.current_rights_version)
      .single();

    if (rightsErr || !rights) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Active rights document not found for offering.',
        400
      );
    }

    // 4. Validate exact acknowledgement terms against database values
    const ack = validated.acknowledgement;
    const dbUnitPriceStr = Number(offering.unit_price_inr).toFixed(2);
    const expectedTotalInr = multiplyMoney(dbUnitPriceStr, unitsStr);

    if (ack.offeringId !== offering.id) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement offering ID mismatch.', 400);
    }
    if (ack.rightsVersion !== offering.current_rights_version) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement rights version mismatch.', 400);
    }
    if (ack.rightsDocumentHash !== rights.rights_document_hash) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement rights document hash mismatch.', 400);
    }
    if (ack.units !== unitsStr) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement units mismatch.', 400);
    }
    if (Number(ack.unitPriceInr).toFixed(2) !== dbUnitPriceStr) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement unit price mismatch.', 400);
    }
    if (Number(ack.totalAmountInr).toFixed(2) !== Number(expectedTotalInr).toFixed(2)) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement total amount calculation mismatch.', 400);
    }
    if (ack.walletAddress.toLowerCase() !== profile.wallet_address.toLowerCase()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement wallet address does not match bound wallet.', 400);
    }
    if (new Date(ack.expiresAt) <= new Date()) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Acknowledgement has expired.', 400);
    }

    // 5. Cryptographically verify EIP-191 signature
    const expectedAckMessage = buildInvestmentAcknowledgementMessage({
      offeringId: offering.id,
      rightsVersion: offering.current_rights_version,
      rightsDocumentHash: rights.rights_document_hash,
      units: unitsStr,
      unitPriceInr: dbUnitPriceStr,
      totalAmountInr: expectedTotalInr,
      walletAddress: profile.wallet_address,
      nonce: ack.nonce,
      expiresAt: ack.expiresAt,
      statement: ack.statement,
    });

    let recoveredSigner: string;
    try {
      recoveredSigner = ethers.verifyMessage(expectedAckMessage, ack.signature).toLowerCase();
    } catch {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Cryptographic verification of acknowledgement signature failed.',
        400
      );
    }

    if (recoveredSigner !== profile.wallet_address.toLowerCase()) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Signature recovered address (${recoveredSigner}) does not match bound wallet (${profile.wallet_address.toLowerCase()}).`,
        400
      );
    }

    // 6. Invoke atomic reserve_units in Postgres
    // Check if an order already exists for this idempotency key to distinguish 201 Created vs 200 OK
    const { data: preExisting } = await admin
      .from('investment_orders')
      .select('id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    const isNewOrder = !preExisting;

    let orderId: string;
    try {
      orderId = await reserveUnitsRpc({
        idempotencyKey,
        investorId: auth.userId,
        offeringId: offering.id,
        units: BigInt(unitsStr),
        ackMessage: expectedAckMessage,
        ackSignature: ack.signature,
        ttlMinutes: 15,
      });
    } catch (rpcErr: any) {
      const msg = rpcErr.message || '';
      if (msg.includes('OFFERING_NOT_FOUND')) {
        throw new AppError(ErrorCodes.OFFERING_NOT_FOUND, 'Offering not found.', 404);
      }
      if (msg.includes('OFFERING_PAUSED_EVIDENCE')) {
        throw new AppError(ErrorCodes.OFFERING_PAUSED_EVIDENCE, 'Offering is paused due to evidence drift.', 409);
      }
      if (msg.includes('OFFERING_NOT_ACTIVE')) {
        throw new AppError(ErrorCodes.OFFERING_NOT_ACTIVE, 'Offering is not active.', 409);
      }
      if (msg.includes('WALLET_NOT_VERIFIED')) {
        throw new AppError(ErrorCodes.WALLET_NOT_VERIFIED, 'Wallet must be verified.', 400);
      }
      if (msg.includes('NOT_ELIGIBLE')) {
        throw new AppError(ErrorCodes.NOT_ELIGIBLE, 'Investor is not accredited or eligible for this offering.', 403);
      }
      if (msg.includes('BELOW_MINIMUM')) {
        throw new AppError(ErrorCodes.BELOW_MINIMUM, `Order units (${unitsStr}) is below minimum of ${offering.minimum_units}.`, 400);
      }
      if (msg.includes('ABOVE_INVESTOR_MAX')) {
        throw new AppError(ErrorCodes.ABOVE_INVESTOR_MAX, `Order exceeds maximum per-investor cap of ${offering.maximum_units_per_investor}.`, 400);
      }
      if (msg.includes('INSUFFICIENT_UNITS')) {
        throw new AppError(ErrorCodes.INSUFFICIENT_UNITS, 'Insufficient remaining offering supply.', 409);
      }
      throw rpcErr;
    }

    // 7. Retrieve confirmed order record
    const { data: order, error: orderFetchErr } = await admin
      .from('investment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderFetchErr || !order) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Failed to retrieve reserved order.', 500);
    }

    return NextResponse.json(
      {
        success: true,
        orderId,
        order,
        status: order.status,
        receiptToken: order.receipt_token,
        expiresAt: order.expires_at,
      },
      { status: isNewOrder ? 201 : 200 }
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}
