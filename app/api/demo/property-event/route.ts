/**
 * /api/demo/property-event
 * ARCH §16.3, §19, §22.2 (D5) · PRD FR-8.2, FR-9.3 · UI §8.8 · PLAN M13.1
 *
 * Admin-only flag-gated endpoint to apply scripted property events:
 * - GET: Returns whether scripted property events are enabled and available demo events
 * - POST: Appends a simulated property snapshot row (#2) to property_snapshots (append-only)
 *
 * Invariants:
 * - Admin role required
 * - Strictly disabled when APP_ENV=production or DEMO_EVENTS!=true (FLAG_DISABLED 403)
 * - Property snapshot is append-only and explicitly marked provenance: 'simulated'
 * - Every operation logged to audit_logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';
import demoEvents from '@/config/demo-events.json';
import { isPropertyEventsEnabled } from '@/lib/demo/property-events';

const applyEventSchema = z.object({
  propertyId: z.string().uuid('Invalid property ID format'),
  eventId: z.string().optional(),
  reason: z.string().min(5, 'A reason of at least 5 characters is required for audit trail'),
  valuationAmountInr: z.string().optional(),
  occupancyPct: z.string().optional(),
  annualRentInr: z.string().optional(),
  operatingCostsInr: z.string().optional(),
  eventNote: z.string().optional(),
  valuationDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const enabled = isPropertyEventsEnabled();
    return NextResponse.json({
      enabled,
      events: demoEvents.events,
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Role verification: Admin only
    const auth = await requireRole(req, ['admin']);

    // 2. Environment guardrail: strictly disabled in production or if flag is false
    if (!isPropertyEventsEnabled()) {
      throw new AppError(
        ErrorCodes.FLAG_DISABLED,
        'Scripted property events are disabled in production or when DEMO_EVENTS=false.',
        403
      );
    }

    // 3. Body validation
    const rawBody = await req.json();
    const parsed = applyEventSchema.parse(rawBody);

    const adminDb = getAdminDbClient();

    // 4. Verify property exists
    const { data: property, error: propErr } = await adminDb
      .from('properties')
      .select('id, name')
      .eq('id', parsed.propertyId)
      .single();

    if (propErr || !property) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Property ${parsed.propertyId} not found`, 404);
    }

    // 5. Query existing snapshots to determine next snapshot_no (e.g. #2)
    const { data: existingSnapshots } = await adminDb
      .from('property_snapshots')
      .select('snapshot_no, valuation_amount_inr, occupancy_pct')
      .eq('property_id', parsed.propertyId)
      .order('snapshot_no', { ascending: false });

    const maxSnapshotNo = existingSnapshots && existingSnapshots.length > 0 ? existingSnapshots[0].snapshot_no : 0;
    const nextSnapshotNo = maxSnapshotNo + 1;

    // 6. Look up current manifest to tie snapshot to an approved manifest
    const { data: currentManifest } = await adminDb
      .from('evidence_manifests')
      .select('id, version')
      .eq('property_id', parsed.propertyId)
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 7. Select event configuration
    const matchingEvent = demoEvents.events.find(
      (e) => e.id === parsed.eventId || e.property_id === parsed.propertyId
    ) || demoEvents.events[0];

    const valuationAmountInr = parsed.valuationAmountInr || matchingEvent?.valuation_amount_inr || '105000000.00';
    const occupancyPct = parsed.occupancyPct || matchingEvent?.occupancy_pct || '85.00';
    const annualRentInr = parsed.annualRentInr || matchingEvent?.annual_rent_inr || '6800000.00';
    const operatingCostsInr = parsed.operatingCostsInr || matchingEvent?.operating_costs_inr || '1600000.00';
    const eventNote =
      parsed.eventNote ||
      matchingEvent?.event_note ||
      'New independent valuation report uploaded reflecting updated market capitalisation rates. IT tenant scaled down partial floor plate during lease renewal.';
    const valuationDate = parsed.valuationDate || matchingEvent?.valuation_date || '2026-11-01';
    const manifestId = currentManifest?.id || null;

    // 8. Insert append-only snapshot row into property_snapshots
    const { data: snapshot, error: insertErr } = await adminDb
      .from('property_snapshots')
      .insert({
        property_id: property.id,
        snapshot_no: nextSnapshotNo,
        as_of: new Date().toISOString(),
        occupancy_pct: occupancyPct,
        annual_rent_inr: annualRentInr,
        operating_costs_inr: operatingCostsInr,
        valuation_amount_inr: valuationAmountInr,
        valuation_date: valuationDate,
        provenance: 'simulated',
        event_note: eventNote,
        manifest_id: manifestId,
        created_by: auth.userId,
      })
      .select()
      .single();

    if (insertErr) {
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to append property snapshot: ${insertErr.message}`,
        500
      );
    }

    // 9. Append audit log entry
    const auditId = await appendAuditLog({
      action: 'property_event_applied',
      actorUserId: auth.userId,
      resourceType: 'property_snapshot',
      resourceId: snapshot.id,
      reason: parsed.reason,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Scripted property event applied successfully.',
        snapshot,
        auditId,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}
