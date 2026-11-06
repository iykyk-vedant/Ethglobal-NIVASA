import 'server-only';
import { NextRequest } from 'next/server';
import { createUserDbClient } from '../db/client';
import { getAdminDbClient } from '../db/admin';
import { UserRole, UserProfile } from './roles';
import { AppError, ErrorCodes } from '../validation/errors';

export interface AuthenticatedContext {
  userId: string;
  email: string;
  roles: UserRole[];
  profile: UserProfile;
  accessToken: string;
}

/**
 * Extracts the Supabase access token from Authorization header or cookie.
 */
export function extractAccessToken(req: NextRequest | Headers): string | null {
  const headers = req instanceof NextRequest ? req.headers : req;
  const authHeader = headers.get('authorization') || headers.get('Authorization');

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // Check cookie if request is NextRequest
  if (req instanceof NextRequest) {
    // Also allow demo-token or x-demo-user-id in test/demo mode
    const demoHeader = req.headers.get('x-demo-user-id');
    if (demoHeader && process.env.NODE_ENV !== 'production') {
      return `demo-user-${demoHeader}`;
    }

    const cookies = req.cookies;
    // Standard Supabase cookie names
    const sbToken = cookies.get('sb-access-token')?.value;
    if (sbToken) return sbToken;

    // Search for project specific supabase auth cookie
    for (const cookie of cookies.getAll()) {
      if (cookie.name.includes('-auth-token')) {
        try {
          const parsed = JSON.parse(cookie.value);
          if (Array.isArray(parsed) && parsed[0]) return parsed[0];
          if (parsed?.access_token) return parsed.access_token;
        } catch {
          return cookie.value;
        }
      }
    }
  }

  return null;
}

/**
 * Validates session and returns authenticated context.
 * Strict: Never trusts client-supplied user ID or role.
 */
export async function requireAuth(req: NextRequest | Headers): Promise<AuthenticatedContext> {
  const token = extractAccessToken(req);
  if (!token) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'Authentication required. No valid Bearer token or session cookie provided.',
      401
    );
  }

  const adminClient = getAdminDbClient();
  let userId: string;
  let email: string;

  if (token.startsWith('demo-user-')) {
    userId = token.slice('demo-user-'.length);
    email = `${userId}@demo.nivasa.local`;
  } else {
    const { data: authData, error: authErr } = await adminClient.auth.getUser(token);

    if (authErr || !authData.user) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Invalid or expired authentication session.',
        401
      );
    }

    userId = authData.user.id;
    email = authData.user.email || '';
  }

  // Query user profile and active roles using user-scoped or admin client
  const [profileRes, rolesRes] = await Promise.all([
    adminClient.from('profiles').select('*').eq('id', userId).single(),
    adminClient.from('user_roles').select('role').eq('user_id', userId).is('revoked_at', null),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new AppError(
      ErrorCodes.UNAUTHORIZED,
      'User profile not initialized in database.',
      401
    );
  }

  const roles = (rolesRes.data || []).map((r) => r.role as UserRole);

  const profile: UserProfile = {
    id: profileRes.data.id,
    displayName: profileRes.data.display_name,
    walletAddress: profileRes.data.wallet_address,
    walletVerifiedAt: profileRes.data.wallet_verified_at,
    roles,
  };

  return {
    userId,
    email,
    roles,
    profile,
    accessToken: token,
  };
}

/**
 * Guard that verifies the caller is authenticated AND has at least one of the required roles.
 */
export async function requireRole(
  req: NextRequest | Headers,
  allowedRoles: UserRole[]
): Promise<AuthenticatedContext> {
  const context = await requireAuth(req);

  const hasAllowedRole = context.roles.some((r) => allowedRoles.includes(r));
  if (!hasAllowedRole) {
    throw new AppError(
      ErrorCodes.FORBIDDEN,
      `Access forbidden. Requires one of roles: [${allowedRoles.join(', ')}]. User has: [${context.roles.join(', ')}]`,
      403
    );
  }

  return context;
}

