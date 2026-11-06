import { NextResponse } from 'next/server';

export const ErrorCodes = {
  // ARCH §19 Stable error codes
  OFFERING_NOT_FOUND: 'OFFERING_NOT_FOUND',
  OFFERING_NOT_ACTIVE: 'OFFERING_NOT_ACTIVE',
  OFFERING_PAUSED_EVIDENCE: 'OFFERING_PAUSED_EVIDENCE',
  WALLET_NOT_VERIFIED: 'WALLET_NOT_VERIFIED',
  NOT_ELIGIBLE: 'NOT_ELIGIBLE',
  BELOW_MINIMUM: 'BELOW_MINIMUM',
  ABOVE_INVESTOR_MAX: 'ABOVE_INVESTOR_MAX',
  INSUFFICIENT_UNITS: 'INSUFFICIENT_UNITS',
  MANIFEST_NOT_APPROVED: 'MANIFEST_NOT_APPROVED',
  SOD_VIOLATION: 'SOD_VIOLATION',
  FLAG_DISABLED: 'FLAG_DISABLED',

  // System & Security error codes
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  BAD_REQUEST: 'BAD_REQUEST',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export interface ApiErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
}

export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  statusCode: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: statusCode }
  );
}

export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      ok: true,
      data,
    },
    { status }
  );
}

