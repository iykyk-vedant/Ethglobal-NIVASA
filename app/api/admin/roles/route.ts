/**
 * /api/admin/roles
 * ARCH §19, UI §8.11, §10.6 · PRD FR-9.x · PLAN M14.4
 *
 * Admin-only role management endpoint:
 * - GET: Returns all users, their profiles, and active assigned roles
 * - POST: Grants or revokes a role using server-only functions and writes to the audit chain
 *
 * Invariants:
 * - Admin role strictly required (requireRole)
 * - Every grant or revoke is audit-logged with actor, action, target user, role, and reason
 * - Database Separation of Duties (SoD) triggers remain active: an admin cannot approve
 *   their own property, offering, or eligibility even if holding multiple roles.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog, grantUserRole, revokeUserRole } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';

const manageRoleSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  role: z.enum(['issuer', 'verifier', 'investor', 'admin'], {
    errorMap: () => ({ message: 'Role must be one of: issuer, verifier, investor, admin' }),
  }),
  action: z.enum(['grant', 'revoke'], {
    errorMap: () => ({ message: 'Action must be "grant" or "revoke"' }),
  }),
  reason: z.string().min(5, 'A substantive justification of at least 5 characters is required'),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    const adminDb = getAdminDbClient();

    // 1. Fetch profiles and active user roles
    const [{ data: profiles, error: profErr }, { data: roles, error: rolesErr }] = await Promise.all([
      adminDb.from('profiles').select('id, display_name, wallet_address, wallet_verified_at, created_at'),
      adminDb.from('user_roles').select('id, user_id, role, granted_at, granted_by').is('revoked_at', null),
    ]);

    if (profErr || rolesErr) {
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        profErr?.message || rolesErr?.message || 'Failed to query user roles',
        500
      );
    }

    // Group roles by user_id
    const rolesByUser: Record<string, string[]> = {};
    for (const r of roles || []) {
      if (!rolesByUser[r.user_id]) rolesByUser[r.user_id] = [];
      rolesByUser[r.user_id].push(r.role);
    }

    const users = (profiles || []).map((p) => ({
      ...p,
      roles: rolesByUser[p.id] || [],
    }));

    return NextResponse.json({
      currentUser: auth.userId,
      users,
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Admin permission check
    const auth = await requireRole(req, ['admin']);

    // 2. Parse & validate body
    const body = await req.json();
    const parsed = manageRoleSchema.parse(body);
    const { userId, role, action, reason } = parsed;

    const adminDb = getAdminDbClient();

    // 3. Verify target user exists
    const { data: targetProfile, error: targetErr } = await adminDb
      .from('profiles')
      .select('id, display_name, wallet_address')
      .eq('id', userId)
      .single();

    if (targetErr || !targetProfile) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Target user ${userId} not found`, 404);
    }

    // 4. Execute grant or revoke
    if (action === 'grant') {
      await grantUserRole(userId, role, auth.userId);
    } else {
      await revokeUserRole(userId, role);
    }

    // 5. Append to hash-chained audit log
    const auditLogId = await appendAuditLog({
      actorUserId: auth.userId,
      action: action === 'grant' ? 'role_granted' : 'role_revoked',
      resourceType: 'user_role',
      resourceId: userId,
      afterHash: role,
      reason: JSON.stringify({
        targetUserId: userId,
        targetDisplayName: targetProfile.display_name,
        role,
        action,
        justification: reason,
        adminUserId: auth.userId,
      }),
    });

    return NextResponse.json({
      success: true,
      action,
      userId,
      role,
      auditLogId,
      message: `Role "${role}" successfully ${action === 'grant' ? 'granted to' : 'revoked from'} ${targetProfile.display_name}.`,
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}
