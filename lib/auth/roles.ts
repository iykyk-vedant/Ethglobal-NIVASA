export type UserRole = 'issuer' | 'verifier' | 'investor' | 'admin';

export interface UserRoleRecord {
  id: string;
  userId: string;
  role: UserRole;
  grantedBy: string | null;
  grantedAt: string;
  revokedAt: string | null;
}

export interface UserProfile {
  id: string;
  displayName: string;
  walletAddress: string | null;
  walletVerifiedAt: string | null;
  roles: UserRole[];
}

export const VALID_ROLES: readonly UserRole[] = ['issuer', 'verifier', 'investor', 'admin'] as const;

export function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

