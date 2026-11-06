import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { z } from 'zod';

const createPropertySchema = z.object({
  name: z.string().min(3).max(255),
  description: z.string().optional().default(''),
  city: z.string().min(2).max(100),
  locality: z.string().min(2).max(100),
  property_type: z.string().min(2).max(50),
  normalized_address: z.string().min(5),
  built_up_area_sqm: z.number().positive(),
  rr_zone_ref: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['issuer', 'admin']);
    const body = await req.json();

    const parseResult = createPropertySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid property creation parameters.',
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const adminDb = getAdminDbClient();
    const data = parseResult.data;

    const { data: property, error: insertErr } = await adminDb
      .from('properties')
      .insert({
        issuer_id: auth.userId,
        name: data.name,
        description: data.description,
        city: data.city,
        locality: data.locality,
        property_type: data.property_type,
        normalized_address: data.normalized_address,
        built_up_area_sqm: data.built_up_area_sqm,
        rr_zone_ref: data.rr_zone_ref || null,
        status: 'draft',
        verification_status: 'draft',
        is_demo: true,
      })
      .select('*')
      .single();

    if (insertErr || !property) {
      throw new Error(`Failed to create property: ${insertErr?.message}`);
    }

    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'PROPERTY_CREATED',
      resourceType: 'properties',
      resourceId: property.id,
      reason: `Property ${property.name} created in draft state`,
    });

    return NextResponse.json({
      success: true,
      property,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'PROPERTY_CREATE_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // If issuer, list their properties; if verifier/admin, list all submitted/in-review
    const isVerifierOrAdmin = auth.roles.includes('verifier') || auth.roles.includes('admin');

    let query = adminDb.from('properties').select('*').order('created_at', { ascending: false });

    if (!isVerifierOrAdmin) {
      query = query.eq('issuer_id', auth.userId);
    }

    const { data: properties, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      success: true,
      properties: properties || [],
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'QUERY_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
