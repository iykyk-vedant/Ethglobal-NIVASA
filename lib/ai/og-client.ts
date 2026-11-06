import 'server-only';
import { getEnv } from '@/lib/env';

export interface RequestAttempt {
  requestId: string;
  timestamp: string;
  model: string;
  provider: '0g';
  status: 'success' | 'failed';
  error?: string;
  latencyMs: number;
  attestation?: {
    sealed: boolean;
    gatewayInstance?: string;
    ratelimitRemaining?: string;
  };
}

export interface OgInferenceOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  repairPrompt?: string;
}

export interface OgInferenceResult {
  success: boolean;
  content: string | null;
  requestId: string;
  model: string;
  provider: '0g';
  timestamp: string;
  attempts: RequestAttempt[];
  status: 'Available' | 'Pending' | 'Temporarily unavailable' | 'Validation failed';
  error?: string;
}

/**
 * Server-only 0G Private Computer client.
 * Strictly communicates with the official 0G Compute Router API.
 * Captures real request IDs and TEE execution headers without fabricating data.
 */
export async function execute0gInference(options: OgInferenceOptions): Promise<OgInferenceResult> {
  const env = getEnv();
  const apiKey = env.OG_API_KEY || '';
  const baseUrl = (env.OG_BASE_URL || 'https://router-api.0g.ai/v1').replace(/\/+$/, '');
  const model = env.OG_MODEL || 'qwen-flash';

  const attempts: RequestAttempt[] = [];

  if (!apiKey) {
    const fallbackAttempt: RequestAttempt = {
      requestId: 'UNCONFIGURED_KEY',
      timestamp: new Date().toISOString(),
      model,
      provider: '0g',
      status: 'failed',
      error: '0G API key not configured on server',
      latencyMs: 0,
    };
    attempts.push(fallbackAttempt);
    return {
      success: false,
      content: null,
      requestId: 'UNCONFIGURED_KEY',
      model,
      provider: '0g',
      timestamp: new Date().toISOString(),
      attempts,
      status: 'Temporarily unavailable',
      error: '0G Private Computer credentials not configured',
    };
  }

  // Attempt 1: Standard inference
  const attempt1 = await callRouterEndpoint({
    baseUrl,
    apiKey,
    model,
    systemPrompt: options.systemPrompt,
    userPrompt: options.userPrompt,
    temperature: options.temperature ?? 0.1,
    maxTokens: options.maxTokens ?? 3500,
  });

  attempts.push(attempt1.attemptRecord);

  // If initial attempt succeeds, return content
  if (attempt1.success && attempt1.content) {
    return {
      success: true,
      content: attempt1.content,
      requestId: attempt1.attemptRecord.requestId,
      model,
      provider: '0g',
      timestamp: attempt1.attemptRecord.timestamp,
      attempts,
      status: 'Available',
    };
  }

  // If failed with upstream/network error (not malformed JSON), fail closed without fake fallback
  if (!attempt1.isMalformedJson || !options.repairPrompt) {
    return {
      success: false,
      content: null,
      requestId: attempt1.attemptRecord.requestId,
      model,
      provider: '0g',
      timestamp: attempt1.attemptRecord.timestamp,
      attempts,
      status: 'Temporarily unavailable',
      error: attempt1.error || '0G inference failed',
    };
  }

  // Attempt 2: At most ONE repair retry on malformed JSON
  const attempt2 = await callRouterEndpoint({
    baseUrl,
    apiKey,
    model,
    systemPrompt: options.systemPrompt,
    userPrompt: `${options.userPrompt}\n\n[REPAIR INSTRUCTION]: The previous response was invalid: ${attempt1.error}. Fix the JSON format and return ONLY strict JSON matching the schema.`,
    temperature: 0.0,
    maxTokens: options.maxTokens ?? 3500,
  });

  attempts.push(attempt2.attemptRecord);

  if (attempt2.success && attempt2.content) {
    return {
      success: true,
      content: attempt2.content,
      requestId: attempt2.attemptRecord.requestId,
      model,
      provider: '0g',
      timestamp: attempt2.attemptRecord.timestamp,
      attempts,
      status: 'Available',
    };
  }

  return {
    success: false,
    content: null,
    requestId: attempt2.attemptRecord.requestId,
    model,
    provider: '0g',
    timestamp: attempt2.attemptRecord.timestamp,
    attempts,
    status: 'Validation failed',
    error: attempt2.error || '0G response failed repair validation',
  };
}

interface CallEndpointParams {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  maxTokens: number;
}

interface CallEndpointResult {
  success: boolean;
  content: string | null;
  error?: string;
  isMalformedJson: boolean;
  attemptRecord: RequestAttempt;
}

async function callRouterEndpoint(params: CallEndpointParams): Promise<CallEndpointResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  let capturedRequestId = 'UNKNOWN';
  let attestationInfo: RequestAttempt['attestation'] = undefined;

  try {
    const response = await fetch(`${params.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: params.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      }),
      // Enforce 25-second serverless timeout per ARCH §16.6
      signal: AbortSignal.timeout(25000),
    });

    const latencyMs = Date.now() - startTime;

    // Capture official 0G headers
    const xRequestId = response.headers.get('x-request-id');
    const x0gE2ee = response.headers.get('x-0g-e2ee');
    const xGateway = response.headers.get('x-0g-gateway-instance');
    const xRateLimitRem = response.headers.get('x-ratelimit-remaining-requests');

    if (x0gE2ee || xGateway) {
      attestationInfo = {
        sealed: x0gE2ee === 'sealed',
        gatewayInstance: xGateway || undefined,
        ratelimitRemaining: xRateLimitRem || undefined,
      };
    }

    if (!response.ok) {
      let errBody = '';
      try {
        const errJson = await response.json();
        capturedRequestId = xRequestId || errJson.id || `REQ_${Date.now()}`;
        errBody = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errBody = await response.text();
        capturedRequestId = xRequestId || `REQ_${Date.now()}`;
      }

      return {
        success: false,
        content: null,
        error: `HTTP ${response.status}: ${errBody}`,
        isMalformedJson: false,
        attemptRecord: {
          requestId: capturedRequestId,
          timestamp,
          model: params.model,
          provider: '0g',
          status: 'failed',
          error: `HTTP ${response.status}: ${errBody}`,
          latencyMs,
          attestation: attestationInfo,
        },
      };
    }

    const data = await response.json();
    capturedRequestId = xRequestId || data.id || `REQ_${Date.now()}`;

    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return {
        success: false,
        content: null,
        error: 'Empty response choices returned from 0G model',
        isMalformedJson: true,
        attemptRecord: {
          requestId: capturedRequestId,
          timestamp,
          model: params.model,
          provider: '0g',
          status: 'failed',
          error: 'Empty content returned',
          latencyMs,
          attestation: attestationInfo,
        },
      };
    }

    // Clean markdown code fence if wrapped
    const cleaned = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/```\s*$/, '')
      .trim();

    return {
      success: true,
      content: cleaned,
      isMalformedJson: false,
      attemptRecord: {
        requestId: capturedRequestId,
        timestamp,
        model: params.model,
        provider: '0g',
        status: 'success',
        latencyMs,
        attestation: attestationInfo,
      },
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const isTimeout = (err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError';
    const errMsg = isTimeout ? '0G inference request timed out (> 25s)' : (err as Error).message;

    return {
      success: false,
      content: null,
      error: errMsg,
      isMalformedJson: false,
      attemptRecord: {
        requestId: capturedRequestId !== 'UNKNOWN' ? capturedRequestId : `ERR_${Date.now()}`,
        timestamp,
        model: params.model,
        provider: '0g',
        status: 'failed',
        error: errMsg,
        latencyMs,
        attestation: attestationInfo,
      },
    };
  }
}
