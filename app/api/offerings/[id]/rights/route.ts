import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { computeRightsDocumentHash, RightsTerms } from '@/lib/offerings/rights';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const rightsInputSchema = z.object({
  rights_type: z.string().default('Commercial Fractional Economic Interest'),
  represents: z.string().min(10, 'Represents clause must be at least 10 characters'),
  does_not_represent: z.string().min(10, 'Does not represent clause must be at least 10 characters'),
  income_entitlement_rule: z.string().min(10, 'Income entitlement rule must be specified'),
  transfer_rule: z.string().min(10, 'Transfer rule must be specified'),
  redemption_rule: z.string().min(10, 'Redemption rule must be specified'),
  voting_or_control_rights: z.string().min(10, 'Voting/control rights clause must be specified'),
  risk_disclosures: z.string().min(10, 'Risk disclosures must be specified'),
  simulated_status: z.string().default('SIMULATED_DEMO_NON_LEGAL'),
});

/**
 * GET /api/offerings/:id/rights
 * Returns all versioned rights documents for the offering.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const admin = getAdminDbClient();

    const { data: rights, error } = await admin
      .from('offering_rights')
      .select('*')
      .eq('offering_id', offeringId)
      .order('version', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/offerings/:id/rights
 * Proposes a new versioned rights document (ARCH §11.1, §11.3, PLAN M9.1).
 * Re-versioning rule (ARCH §11.3): A new rights version requires re-approval and re-anchoring;
 * moves offering state to 'legal_review_pending'.
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

    // 2. Parse & Validate Payload
    const body = await req.json();
    const parse = rightsInputSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: parse.error.format() },
        { status: 400 }
      );
    }

    // 3. Determine next version number
    const { data: latestRights } = await admin
      .from('offering_rights')
      .select('version')
      .eq('offering_id', offeringId)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestRights?.version ?? 0) + 1;

    const terms: RightsTerms = {
      offering_id: offeringId,
      version: nextVersion,
      rights_type: parse.data.rights_type,
      represents: parse.data.represents,
      does_not_represent: parse.data.does_not_represent,
      income_entitlement_rule: parse.data.income_entitlement_rule,
      transfer_rule: parse.data.transfer_rule,
      redemption_rule: parse.data.redemption_rule,
      voting_or_control_rights: parse.data.voting_or_control_rights,
      risk_disclosures: parse.data.risk_disclosures,
      simulated_status: parse.data.simulated_status,
    };

    // 4. Compute deterministic document hash
    const documentHash = computeRightsDocumentHash(terms);

    // 5. Insert new versioned rights record
    const { data: newRightsRecord, error: rightsInsertErr } = await admin
      .from('offering_rights')
      .insert({
        offering_id: offeringId,
        version: nextVersion,
        rights_type: terms.rights_type,
        rights_document_path: `offerings/${offeringId}/rights-v${nextVersion}.json`,
        represents: terms.represents,
        does_not_represent: terms.does_not_represent,
        income_entitlement_rule: terms.income_entitlement_rule,
        transfer_rule: terms.transfer_rule,
        redemption_rule: terms.redemption_rule,
        voting_or_control_rights: terms.voting_or_control_rights,
        risk_disclosures: terms.risk_disclosures,
        simulated_status: terms.simulated_status,
        rights_document_hash: documentHash,
        terms_json: terms as any,
      })
      .select()
      .single();

    if (rightsInsertErr || !newRightsRecord) {
      return NextResponse.json(
        { error: 'RIGHTS_INSERT_FAILED', message: rightsInsertErr?.message },
        { status: 500 }
      );
    }

    // 6. Update Offering: point to new rights version, reset state to legal_review_pending
    // Re-approval and re-anchoring required (ARCH §11.3)
    const { error: offUpdateErr } = await admin
      .from('offerings')
      .update({
        current_rights_version: nextVersion,
        status: 'legal_review_pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', offeringId);

    if (offUpdateErr) {
      return NextResponse.json(
        { error: 'OFFERING_UPDATE_FAILED', message: offUpdateErr.message },
        { status: 500 }
      );
    }

    // 7. Audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'rights_version_created',
      resourceType: 'offering_rights',
      resourceId: newRightsRecord.id,
      afterHash: documentHash,
      reason: JSON.stringify({
        offeringId,
        version: nextVersion,
        previousVersion: latestRights?.version ?? null,
      }),
    });

    return NextResponse.json(
      {
        success: true,
        rights: newRightsRecord,
        message: `Rights version ${nextVersion} created. Offering status moved to legal_review_pending.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}
