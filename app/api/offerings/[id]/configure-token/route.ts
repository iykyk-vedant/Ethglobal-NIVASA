import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { computeConfigurationHash } from '@/lib/offerings/rights';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const configureTokenSchema = z.object({
  ats_asset_ref: z.string().min(1, 'ATS asset reference is required'),
  token_contract_id: z.string().regex(/^0\.0\.\d+$/, 'Invalid Hedera contract ID format (0.0.X)'),
  token_evm_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address format (0x + 40 hex)'),
  kyc_required: z.boolean().default(true),
  transfer_restricted: z.boolean().default(true),
});

/**
 * POST /api/offerings/:id/configure-token
 * Records ATS token configuration and moves state to 'token_configured' (ARCH §9.3, PLAN M9.2).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const auth = await requireRole(req, ['issuer', 'admin']);
    const admin = getAdminDbClient();

    // 1. Fetch Offering
    const { data: offering, error: offErr } = await admin
      .from('offerings')
      .select('*')
      .eq('id', offeringId)
      .single();

    if (offErr || !offering) {
      return NextResponse.json(
        { error: 'OFFERING_NOT_FOUND', message: 'Target offering does not exist.' },
        { status: 404 }
      );
    }

    // 2. State Check: must be approved_for_demo (or already token_configured for update)
    if (offering.status !== 'approved_for_demo' && offering.status !== 'token_configured') {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Cannot configure token: Offering must be in "approved_for_demo" status. Current status is "${offering.status}".`,
        },
        { status: 400 }
      );
    }

    // 3. Validate Body
    const body = await req.json();
    const parse = configureTokenSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parse.error.format() },
        { status: 400 }
      );
    }

    const {
      ats_asset_ref,
      token_contract_id,
      token_evm_address,
      kyc_required,
      transfer_restricted,
    } = parse.data;

    // 4. Compute Configuration Hash (ARCH §9.3, PLAN M9.2)
    const configHash = computeConfigurationHash({
      ats_asset_ref,
      token_contract_id,
      token_evm_address,
      chain_id: offering.chain_id || 296,
      total_units: offering.total_units || '10000',
      kyc_required,
      transfer_restricted,
    });

    const now = new Date().toISOString();

    // 5. Update Offering -> token_configured
    const { error: updateErr } = await admin
      .from('offerings')
      .update({
        ats_asset_ref,
        token_contract_id,
        token_evm_address,
        configuration_hash: configHash,
        status: 'token_configured',
        updated_at: now,
      })
      .eq('id', offeringId);

    if (updateErr) {
      return NextResponse.json(
        { error: 'TOKEN_CONFIGURATION_FAILED', message: updateErr.message },
        { status: 500 }
      );
    }

    // 6. Audit Configuration Mutation
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_token_configured',
      resourceType: 'offering',
      resourceId: offeringId,
      beforeHash: offering.configuration_hash || null,
      afterHash: configHash,
      reason: JSON.stringify({
        ats_asset_ref,
        token_contract_id,
        token_evm_address,
      }),
    });

    return NextResponse.json({
      success: true,
      status: 'token_configured',
      configurationHash: configHash,
      message: 'ATS token configured. Ready for D1 activation gate.',
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}
