import 'server-only';
import { createHash } from 'crypto';
import { getAdminDbClient } from '@/lib/db/admin';
import { computeMetricDeltas, DeterministicMetrics, PropertySnapshotData } from './metrics';
import { evaluatePreferenceFit, InvestorPreferences } from './fit-policy';
import { execute0gInference, RequestAttempt } from './og-client';
import { validateAiResponse } from './validator';
import { AiResponse } from './schemas';
import demoEvents from '@/config/demo-events.json';

export interface RunAnalysisParams {
  propertyId: string;
  snapshotFrom?: number;
  snapshotTo?: number;
  investorId?: string | null;
  preferences?: InvestorPreferences;
}

export interface AnalysisOutcome {
  episodeId: string;
  propertyId: string;
  snapshotFrom: number;
  snapshotTo: number;
  status: 'Available' | 'Pending' | 'Temporarily unavailable' | 'Validation failed';
  deterministicMetrics: DeterministicMetrics;
  preferenceFit: string;
  validatedResponse: AiResponse | null;
  requestAttempts: RequestAttempt[];
  inputHash: string;
  outputHash: string;
  provider: '0g';
  model: string;
  timestamp: string;
  isCached: boolean;
  errors?: string[];
}

/**
 * Deterministically sorts object keys for canonical JSON hashing (ARCH §16.6).
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalJsonStringify(item)).join(',')}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map(
    (k) => `${JSON.stringify(k)}:${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`
  );
  return `{${entries.join(',')}}`;
}

export function computeSha256(canonicalString: string): string {
  return createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Executes or retrieves the 0G Private Computer Property Intelligence analysis.
 */
export async function runPropertyAnalysis(params: RunAnalysisParams): Promise<AnalysisOutcome> {
  const adminDb = getAdminDbClient();
  const snapFromNo = params.snapshotFrom || 1;
  const snapToNo = params.snapshotTo || 2;

  // 1. Fetch snapshots from database
  const { data: dbSnapshots } = await adminDb
    .from('property_snapshots')
    .select('*')
    .eq('property_id', params.propertyId)
    .order('snapshot_no', { ascending: true });

  const snapshotsMap = new Map<number, PropertySnapshotData>();
  if (dbSnapshots) {
    for (const s of dbSnapshots) {
      snapshotsMap.set(s.snapshot_no, {
        snapshot_no: Number(s.snapshot_no),
        as_of: s.as_of,
        occupancy_pct: String(s.occupancy_pct),
        annual_rent_inr: String(s.annual_rent_inr),
        operating_costs_inr: String(s.operating_costs_inr),
        valuation_amount_inr: String(s.valuation_amount_inr),
        valuation_date: s.valuation_date,
        provenance: s.provenance,
        event_note: s.event_note,
        manifest_id: s.manifest_id,
        checklist_completeness_pct: '100.00',
        evidence_record_ids: ['doc-title-001', 'doc-val-rep-001', 'doc-khata-001', 'doc-tax-001'],
      });
    }
  }

  // If Snapshot 2 is not yet in DB, check demo events and insert it
  if (!snapshotsMap.has(snapToNo)) {
    const matchingDemoEvent = demoEvents.events.find(
      (e) => e.property_id === params.propertyId && e.snapshot_no === snapToNo
    );

    if (matchingDemoEvent) {
      const snap2Data: PropertySnapshotData = {
        snapshot_no: matchingDemoEvent.snapshot_no,
        as_of: matchingDemoEvent.as_of,
        occupancy_pct: matchingDemoEvent.occupancy_pct,
        annual_rent_inr: matchingDemoEvent.annual_rent_inr,
        operating_costs_inr: matchingDemoEvent.operating_costs_inr,
        valuation_amount_inr: matchingDemoEvent.valuation_amount_inr,
        valuation_date: matchingDemoEvent.valuation_date,
        provenance: matchingDemoEvent.provenance as PropertySnapshotData['provenance'],
        event_note: matchingDemoEvent.event_note,
        manifest_id: null,
        checklist_completeness_pct: matchingDemoEvent.checklist_completeness_pct,
        evidence_record_ids: matchingDemoEvent.evidence_record_ids,
      };

      // Best effort persist snapshot 2
      try {
        const { data: adminUser } = await adminDb.from('profiles').select('id').eq('role', 'admin').limit(1).single();
        if (adminUser) {
          await adminDb.from('property_snapshots').insert({
            property_id: params.propertyId,
            snapshot_no: snap2Data.snapshot_no,
            as_of: snap2Data.as_of,
            occupancy_pct: snap2Data.occupancy_pct,
            annual_rent_inr: snap2Data.annual_rent_inr,
            operating_costs_inr: snap2Data.operating_costs_inr,
            valuation_amount_inr: snap2Data.valuation_amount_inr,
            valuation_date: snap2Data.valuation_date,
            provenance: snap2Data.provenance,
            event_note: snap2Data.event_note,
            created_by: adminUser.id,
          });
        }
      } catch {
        // Continue if DB insert fails or violates constraint
      }

      snapshotsMap.set(snapToNo, snap2Data);
    }
  }

  const snapFrom = snapshotsMap.get(snapFromNo);
  const snapTo = snapshotsMap.get(snapToNo);

  if (!snapFrom || !snapTo) {
    throw new Error(
      `[AI_ADVISOR_ERROR] Snapshots ${snapFromNo} and ${snapToNo} not found for property ${params.propertyId}`
    );
  }

  // 2. Compute Deterministic Metrics and Deltas
  const allowedEvidenceIds = Array.from(
    new Set([...(snapFrom.evidence_record_ids || []), ...(snapTo.evidence_record_ids || [])])
  );
  const deterministicMetrics = computeMetricDeltas(snapFrom, snapTo, allowedEvidenceIds);

  // 3. Compute Baseline Fit Policy
  const fitResult = evaluatePreferenceFit(deterministicMetrics, params.preferences, {
    manifestCompletenessPct: snapTo.checklist_completeness_pct || 100,
  });

  // 4. Input canonical hash
  const inputSnapshot = {
    property_id: params.propertyId,
    snapshot_from: snapFrom,
    snapshot_to: snapTo,
    deterministic_metrics: deterministicMetrics,
    investor_preferences: params.preferences || null,
  };
  const inputCanonical = canonicalJsonStringify(inputSnapshot);
  const inputHash = computeSha256(inputCanonical);

  // 5. Short-window Cache Check (5 minutes)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: cachedEpisode } = await adminDb
    .from('ai_episodes')
    .select('*')
    .eq('property_id', params.propertyId)
    .eq('input_hash', inputHash)
    .eq('status', 'completed')
    .gte('created_at', fiveMinutesAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cachedEpisode) {
    return {
      episodeId: cachedEpisode.id,
      propertyId: params.propertyId,
      snapshotFrom: snapFromNo,
      snapshotTo: snapToNo,
      status: 'Available',
      deterministicMetrics: cachedEpisode.deterministic_metrics as DeterministicMetrics,
      preferenceFit: cachedEpisode.validated_response?.preference_fit || fitResult.preference_fit,
      validatedResponse: cachedEpisode.validated_response as AiResponse,
      requestAttempts: (cachedEpisode.request_attempts as RequestAttempt[]) || [],
      inputHash: cachedEpisode.input_hash,
      outputHash: cachedEpisode.output_hash,
      provider: '0g',
      model: cachedEpisode.model_name,
      timestamp: cachedEpisode.created_at,
      isCached: true,
    };
  }

  // 6. Build Fixed System & User Prompt (delimit untrusted issuer text per ARCH §16.9)
  const systemPrompt = `You are the 0G Private Computer Property Intelligence engine for NIVASA.
Your sole job is to produce an evidence-grounded, fact-based JSON summary explaining deterministic metric deltas between two property snapshots.

NON-NEGOTIABLE RULES:
1. Output MUST be valid, strict JSON matching this exact schema:
{
  "summary": string (factual, non-promotional explanation of metric deltas),
  "preference_fit": "insufficient_evidence" | "poor_match" | "partial_match" | "good_match",
  "changes": [
    {
      "indicator": string,
      "from": string,
      "to": string,
      "direction": "improved" | "weakened" | "unchanged" | "unsupported",
      "supporting_evidence_ids": string[]
    }
  ],
  "risk_flags": string[],
  "assumptions": string[],
  "missing_information": string[],
  "cannot_determine": string[],
  "source_ids": string[],
  "disclaimer": "Educational analysis only; not investment advice."
}
2. You MUST cite ONLY source_ids and supporting_evidence_ids from the allowed list: ${JSON.stringify(
    allowedEvidenceIds
  )}.
3. NEVER invent numbers in your prose! Every single number in your summary, risk_flags, and assumptions MUST appear in the deterministic metrics table.
4. STRICTLY NO UNSOURCED CAUSAL CLAIMS! Do NOT use words like "due to", "because", "caused by", or "as a result of" in your summary or risk flags unless verbatim present in the UNTRUSTED_ISSUER_NOTE. If the cause is not explicitly given, you MUST place it in cannot_determine (e.g. "Why occupancy fell: the supplied data does not state a cause").
5. Return ONLY the JSON object. Do not include markdown code ticks.`;

  const userPrompt = `Analyze the following deterministic property delta:

DETERMINISTIC METRICS (Summary of deltas):
${JSON.stringify(deterministicMetrics.deltas.map(d => ({ indicator: d.indicator, from: d.from, to: d.to, direction: d.direction })), null, 2)}

PREFERENCE FIT BASELINE:
${fitResult.preference_fit}

ALLOWED EVIDENCE IDS (cite only from this list):
${JSON.stringify(allowedEvidenceIds)}

<<<UNTRUSTED_ISSUER_NOTE
${snapTo.event_note || 'None provided.'}
>>>

Generate the concise ARCH §16.7 JSON explanation. Include 2 to 4 key indicators in "changes" and ensure valid, complete JSON.`;

  // 7. Execute 0G Inference via 0G Private Computer Router
  const inference = await execute0gInference({
    systemPrompt,
    userPrompt,
    repairPrompt: 'Repair schema and number validation.',
  });

  const timestamp = inference.timestamp;
  let validationErrors: string[] = [];
  let validatedData: AiResponse | null = null;
  let finalStatus: AnalysisOutcome['status'] = inference.status;

  if (inference.success && inference.content) {
    const validation = validateAiResponse(
      inference.content,
      deterministicMetrics,
      allowedEvidenceIds,
      snapTo.event_note
    );

    if (validation.success) {
      validatedData = validation.data;
      finalStatus = 'Available';
    } else {
      validationErrors = validation.errors;
      finalStatus = 'Validation failed';
    }
  }

  // 8. Compute Output Hash
  const outputCanonical = canonicalJsonStringify(validatedData || { error: inference.error || validationErrors });
  const outputHash = computeSha256(outputCanonical);

  // 9. Persist episode in database
  let episodeId = `temp-${Date.now()}`;
  try {
    const { data: episodeRow, error: epErr } = await adminDb
      .from('ai_episodes')
      .insert({
        investor_id: params.investorId || null,
        property_id: params.propertyId,
        snapshot_from: snapFromNo,
        snapshot_to: snapToNo,
        request_id: inference.requestId,
        provider: '0g',
        model_name: inference.model,
        input_hash: inputHash,
        output_hash: outputHash,
        input_snapshot: inputSnapshot,
        deterministic_metrics: deterministicMetrics,
        validated_response: validatedData || {},
        request_attempts: inference.attempts,
        status: finalStatus === 'Available' ? 'completed' : 'failed',
      })
      .select('id')
      .single();

    if (episodeRow) {
      episodeId = episodeRow.id;
    }
  } catch {
    // If DB save has an issue, preserve episodeId
  }

  return {
    episodeId,
    propertyId: params.propertyId,
    snapshotFrom: snapFromNo,
    snapshotTo: snapToNo,
    status: finalStatus,
    deterministicMetrics,
    preferenceFit: validatedData?.preference_fit || fitResult.preference_fit,
    validatedResponse: validatedData,
    requestAttempts: inference.attempts,
    inputHash,
    outputHash,
    provider: '0g',
    model: inference.model,
    timestamp,
    isCached: false,
    errors: validationErrors.length > 0 ? validationErrors : inference.error ? [inference.error] : undefined,
  };
}
