/**
 * GET /api/public/verify/offering/[id]
 * ARCH §13.1, §6.4, §20 · PRD FR-7.1, FR-7.4 · UI §8.9 · PLAN M11.2
 *
 * Public endpoint for zero-login technical verification:
 * - Public data ONLY via narrow queries (zero PII, zero server keys)
 * - Hashes-only manifest JSON and synthetic rights document
 * - In-memory rate limiting per client IP
 * - 30-second cache header
 * - Comprehensive checks C1–C7
 */

import { NextRequest, NextResponse } from 'next/server';
import { runOfferingVerificationChecks, defaultDbReader } from '@/lib/verify/checks';

// In-memory rate limiter per client IP: 60 requests per 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many public verification requests. Please wait a minute before querying again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const { id: offeringId } = await context.params;

  try {
    // 1. Run all 7 pure verification checks
    const report = await runOfferingVerificationChecks(offeringId);

    // 2. Fetch public offering view data
    const offering = await defaultDbReader.getPublicOffering(offeringId);
    if (!offering) {
      return NextResponse.json(
        {
          error: 'OFFERING_NOT_FOUND',
          message: `Offering ${offeringId} does not exist or is not published.`,
        },
        { status: 404 }
      );
    }

    // 3. Fetch synthetic rights document and hashes-only manifest
    const [syntheticRights, manifest] = await Promise.all([
      defaultDbReader.getSyntheticRights(offeringId, offering.current_rights_version),
      offering.property_id ? defaultDbReader.getApprovedManifest(offering.property_id) : Promise.resolve(null),
    ]);

    // Format hashes-only manifest (no internal file paths or storage URLs)
    const publicManifest = manifest
      ? {
          id: manifest.id,
          version: manifest.version,
          status: manifest.status,
          merkle_root: manifest.merkle_root,
          completeness_pct: manifest.completeness_pct,
          documents: (manifest.documents || []).map((doc) => ({
            document_id: doc.document_id,
            document_type: doc.document_type,
            sha256_hash: doc.sha256_hash,
            source_name: doc.source_name,
            source_reference: doc.source_reference,
            issued_at: doc.issued_at,
            valid_until: doc.valid_until,
            status: doc.status,
            limitation_note: doc.limitation_note,
            leaf_hash: doc.leaf_hash,
          })),
        }
      : null;

    // Format public synthetic rights document (terms only, zero identities)
    const publicRights = syntheticRights
      ? {
          offering_id: syntheticRights.offering_id,
          version: syntheticRights.version,
          rights_type: syntheticRights.rights_type,
          represents: syntheticRights.represents,
          does_not_represent: syntheticRights.does_not_represent,
          income_entitlement_rule: syntheticRights.income_entitlement_rule,
          transfer_rule: syntheticRights.transfer_rule,
          redemption_rule: syntheticRights.redemption_rule,
          voting_or_control_rights: syntheticRights.voting_or_control_rights,
          risk_disclosures: syntheticRights.risk_disclosures,
          simulated_status: syntheticRights.simulated_status,
          rights_document_hash: syntheticRights.rights_document_hash,
        }
      : null;

    const responsePayload = {
      offering: {
        id: offering.id,
        token_name: offering.token_name,
        token_symbol: offering.token_symbol,
        ats_asset_ref: offering.ats_asset_ref,
        token_contract_id: offering.token_contract_id,
        status: offering.status,
        total_units: offering.total_units,
        unit_price_inr: offering.unit_price_inr,
      },
      summary: report.summary,
      checks: report.checks,
      synthetic_rights: publicRights,
      manifest: publicManifest,
      checked_at: report.checkedAt,
      disclaimer:
        'Technical prototype integrity audit only; not proof of title, legal validity, regulatory authorization, or investment suitability.',
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'VERIFICATION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown verification error occurred',
      },
      { status: 500 }
    );
  }
}

