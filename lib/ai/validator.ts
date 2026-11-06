import { aiResponseSchema, AiResponse } from './schemas';
import { DeterministicMetrics } from './metrics';

export interface ValidationSuccess {
  success: true;
  data: AiResponse;
}

export interface ValidationFailure {
  success: false;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates 0G Private Computer AI response against deterministic metrics and ground-truth rules.
 * Strictly enforces ARCH §16.7 and §22.2 (D5): Rejects malformed JSON, unexpected enums,
 * foreign evidence IDs, invented numbers, and unsourced causal claims.
 */
export function validateAiResponse(
  rawInput: string | unknown,
  metrics: DeterministicMetrics,
  allowedEvidenceIds: string[],
  eventNote: string | null = null
): ValidationResult {
  const errors: string[] = [];

  // 1. JSON parsing
  let parsed: unknown = rawInput;
  if (typeof rawInput === 'string') {
    try {
      parsed = JSON.parse(rawInput);
    } catch (e) {
      return {
        success: false,
        errors: [`MALFORMED_JSON: Failed to parse AI response as JSON: ${(e as Error).message}`],
      };
    }
  }

  // 2. Zod Schema validation
  const schemaResult = aiResponseSchema.safeParse(parsed);
  if (!schemaResult.success) {
    const formattedErrors = schemaResult.error.errors.map(
      (err) => `SCHEMA_VALIDATION_ERROR: [${err.path.join('.')}]: ${err.message}`
    );
    return {
      success: false,
      errors: formattedErrors,
    };
  }

  const data = schemaResult.data;

  // 3. Evidence and Source ID Allowlist
  const allowlistSet = new Set(allowedEvidenceIds.map((id) => id.toLowerCase()));
  allowlistSet.add('unsupported');
  allowlistSet.add(`snap-${metrics.snapshot_from_no}`);
  allowlistSet.add(`snap-${metrics.snapshot_to_no}`);
  allowlistSet.add(String(metrics.snapshot_from_no));
  allowlistSet.add(String(metrics.snapshot_to_no));

  for (const srcId of data.source_ids) {
    if (!allowlistSet.has(srcId.toLowerCase())) {
      errors.push(`FOREIGN_EVIDENCE_ID: source_id "${srcId}" is not present in allowed evidence set`);
    }
  }

  for (const change of data.changes) {
    for (const evId of change.supporting_evidence_ids) {
      if (!allowlistSet.has(evId.toLowerCase())) {
        errors.push(
          `FOREIGN_EVIDENCE_ID: change "${change.indicator}" cites foreign evidence ID "${evId}" not in allowlist`
        );
      }
    }
  }

  // 4. Number Verification in Prose (Anti-Hallucination)
  // Build a normalized set of all numbers approved from the deterministic metrics
  const approvedNumbers = new Set<string>();
  for (const num of metrics.allowed_numbers) {
    const clean = num.replace(/,/g, '').trim();
    approvedNumbers.add(clean);
    // Strip decimal if .00
    if (clean.includes('.')) {
      const parts = clean.split('.');
      if (Number(parts[1]) === 0) {
        approvedNumbers.add(parts[0]);
      }
    }
  }

  // Trivial numbers allowed in prose (like snapshot numbers 1, 2)
  approvedNumbers.add('1');
  approvedNumbers.add('2');
  approvedNumbers.add('0');

  // Fields to scan for prose numbers
  const proseFields: Array<{ name: string; text: string }> = [
    { name: 'summary', text: data.summary },
    ...data.risk_flags.map((rf, idx) => ({ name: `risk_flags[${idx}]`, text: rf })),
    ...data.assumptions.map((as, idx) => ({ name: `assumptions[${idx}]`, text: as })),
  ];

  // Regex to extract numbers with optional commas/decimals/percent
  const numberRegex = /\b\d+(?:,\d+)*(?:\.\d+)?%?\b/g;

  for (const field of proseFields) {
    const matches = field.text.match(numberRegex) || [];
    for (const match of matches) {
      const cleanMatch = match.replace(/,/g, '').replace(/%/g, '').trim();
      // If the match is not in approved numbers
      if (!approvedNumbers.has(cleanMatch)) {
        // Double check if formatted with decimal exists
        const withDec = Number(cleanMatch).toFixed(2);
        if (!approvedNumbers.has(withDec)) {
          errors.push(
            `INVENTED_NUMBER: Prose in ${field.name} contains unapproved number "${match}" not derived from deterministic metrics`
          );
        }
      }
    }
  }

  // 5. Causal Claims Check
  // The model may NOT invent causes for changes unless stated in eventNote (ARCH §16.7, §22.2 D5)
  const causalKeywordsRegex = /\b(because|caused by|as a result of|due to|resulting from|led to|reason is)\b/i;
  const eventNoteNormalized = (eventNote || '').trim().toLowerCase();

  const causalFields = [
    { name: 'summary', text: data.summary },
    ...data.risk_flags.map((rf, idx) => ({ name: `risk_flags[${idx}]`, text: rf })),
  ];

  for (const field of causalFields) {
    const match = field.text.match(causalKeywordsRegex);
    if (match) {
      if (!eventNoteNormalized) {
        // If event note is empty, no causal assertions are allowed
        errors.push(
          `UNSOURCED_CAUSAL_CLAIM: ${field.name} makes a causal claim using "${match[0]}" but no event note exists`
        );
      } else {
        // When event note exists, ensure the prose does not inject unstated causes
        const forbiddenInventedCauses = [
          'bankrupt',
          'recession',
          'fire',
          'fraud',
          'crash',
          'default',
          'litigation',
          'lawsuit',
          'earthquake',
          'insolvency',
        ];

        for (const ic of forbiddenInventedCauses) {
          if (field.text.toLowerCase().includes(ic) && !eventNoteNormalized.includes(ic)) {
            errors.push(
              `UNSOURCED_CAUSAL_CLAIM: ${field.name} claims invented cause "${ic}" not present in event note`
            );
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data,
  };
}
