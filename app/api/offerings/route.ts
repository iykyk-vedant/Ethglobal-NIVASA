import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { z } from 'zod';

const proposeOfferingSchema = z.object({
  property_id: z.string().uuid('Invalid property ID'),
  token_name: z.string().min(3, 'Token name must be at least 3 characters'),
  token_symbol: z.string().min(2, 'Token symbol must be at least 2 characters'),
  asset_type: z.string().default('commercial_equity'),
  chain_id: z.number().int().default(296),
  total_units: z.number().int().positive().default(10000),
  unit_price_inr: z.string().min(1, 'Unit price is required'),
  minimum_units: z.number().int().positive().default(1),
  maximum_units_per_investor: z.number().int().positive().default(500),
});

/**
 * GET /api/offerings
 * Public / authenticated list of offerings.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminDbClient();
    const { data: offerings, error } = await admin
      .from('offerings')
      .select('*, properties(*)')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ offerings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/offerings
 * Proposes a new offering (ARCH §9.3, §19, PLAN M9.1).
 * Requires: verified property with an approved manifest.
 * Fail-closed: returns MANIFEST_NOT_APPROVED if manifest is missing or not approved.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['issuer', 'admin']);
    const body = await req.json();
    const parse = proposeOfferingSchema.safeParse(body);

    if (!parse.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parse.error.format() },
        { status: 400 }
      );
    }

    const {
      property_id,
      token_name,
      token_symbol,
      asset_type,
      chain_id,
      total_units,
      unit_price_inr,
      minimum_units,
      maximum_units_per_investor,
    } = parse.data;

    const admin = getAdminDbClient();

    // 1. Check Property verification status
    const { data: property, error: propErr } = await admin
      .from('properties')
      .select('*')
      .eq('id', property_id)
      .single();

    if (propErr || !property) {
      return NextResponse.json(
        { error: 'PROPERTY_NOT_FOUND', message: 'Target property does not exist.' },
        { status: 404 }
      );
    }

    if (property.status !== 'verified') {
      return NextResponse.json(
        {
          error: 'PROPERTY_NOT_VERIFIED',
          message: `Cannot propose offering: Property status is "${property.status}", must be "verified".`,
        },
        { status: 400 }
      );
    }

    // 2. Check Approved Evidence Manifest (ARCH §9.3 guard: proposed requires a verified property with an approved manifest)
    const { data: manifest, error: manifestErr } = await admin
      .from('evidence_manifests')
      .select('*')
      .eq('property_id', property_id)
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (manifestErr || !manifest) {
      return NextResponse.json(
        {
          error: 'MANIFEST_NOT_APPROVED',
          message: 'Offering proposal requires a verified property with an approved evidence manifest.',
        },
        { status: 400 }
      );
    }

    // 3. Create Offering in 'proposed' state
    const { data: newOffering, error: createErr } = await admin
      .from('offerings')
      .insert({
        property_id,
        issuer_id: auth.userId,
        proposed_by: auth.userId,
        token_name,
        token_symbol,
        asset_type,
        chain_id,
        ats_asset_ref: token_symbol,
        total_units: total_units.toString(),
        unit_price_inr,
        minimum_units: minimum_units.toString(),
        maximum_units_per_investor: maximum_units_per_investor.toString(),
        status: 'proposed',
        current_rights_version: 1,
        current_manifest_id: manifest.id,
      })
      .select()
      .single();

    if (createErr || !newOffering) {
      return NextResponse.json(
        { error: 'OFFERING_CREATION_FAILED', message: createErr?.message },
        { status: 500 }
      );
    }

    // 4. Audit privileged creation
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_proposed',
      resourceType: 'offering',
      resourceId: newOffering.id,
      afterHash: manifest.merkle_root,
      reason: JSON.stringify({
        token_name,
        token_symbol,
        property_id,
        approved_manifest_id: manifest.id,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        offering: newOffering,
        message: 'Offering proposed successfully.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}

