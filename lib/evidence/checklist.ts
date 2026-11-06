import checklistConfig from '@/config/evidence-checklist.maharashtra.json';
import { toDecimal } from '@/lib/money/decimal';

export interface ChecklistConfigItem {
  code: string;
  name: string;
  issuing_authority: string;
  weight: number;
  required: boolean;
  max_age_days: number | null;
  description: string;
}

export interface DocumentRecordInput {
  id: string;
  document_type: string;
  status: 'active' | 'superseded' | 'disputed' | 'rejected';
  issued_at?: string | null;
  valid_until?: string | null;
  received_at?: string | null;
}

export interface ChecklistItemEvaluation {
  code: string;
  name: string;
  weight: number;
  required: boolean;
  max_age_days: number | null;
  status: 'verified' | 'missing' | 'expired' | 'unverified';
  documentId?: string;
  daysOld?: number;
  isExpired?: boolean;
}

export interface CompletenessResult {
  completenessPct: string;
  earnedWeight: number;
  totalRequiredWeight: number;
  totalChecklistWeight: number;
  isComplete: boolean;
  items: ChecklistItemEvaluation[];
  missingRequiredCodes: string[];
  expiredCodes: string[];
}

export function getChecklistConfig(): ChecklistConfigItem[] {
  return checklistConfig.items as ChecklistConfigItem[];
}

/**
 * Calculates weighted checklist completeness for evidence documents.
 * Completeness = weighted share of required documents that are present, active, and within validity date.
 * Strictly adheres to ARCH §10.2: "Weighted checklist completeness — not a title-clearance score".
 */
export function calculateChecklistCompleteness(
  documents: DocumentRecordInput[],
  asOfDate: Date = new Date()
): CompletenessResult {
  const config = getChecklistConfig();

  let earnedWeight = 0;
  let totalRequiredWeight = 0;
  let totalChecklistWeight = 0;

  const missingRequiredCodes: string[] = [];
  const expiredCodes: string[] = [];
  const evaluatedItems: ChecklistItemEvaluation[] = [];

  const activeDocsByType = new Map<string, DocumentRecordInput>();
  for (const doc of documents) {
    if (doc.status === 'active') {
      // If multiple active, keep latest
      activeDocsByType.set(doc.document_type.toLowerCase(), doc);
    }
  }

  for (const item of config) {
    totalChecklistWeight += item.weight;
    if (item.required) {
      totalRequiredWeight += item.weight;
    }

    const doc = activeDocsByType.get(item.code.toLowerCase());

    if (!doc) {
      if (item.required) {
        missingRequiredCodes.push(item.code);
      }
      evaluatedItems.push({
        code: item.code,
        name: item.name,
        weight: item.weight,
        required: item.required,
        max_age_days: item.max_age_days,
        status: 'missing',
      });
      continue;
    }

    // Check validity dates
    let isExpired = false;
    let daysOld: number | undefined = undefined;

    if (doc.valid_until) {
      const validUntilDate = new Date(doc.valid_until);
      if (asOfDate.getTime() > validUntilDate.getTime()) {
        isExpired = true;
      }
    }

    if (!isExpired && item.max_age_days !== null && doc.issued_at) {
      const issuedAtDate = new Date(doc.issued_at);
      daysOld = Math.floor((asOfDate.getTime() - issuedAtDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld > item.max_age_days) {
        isExpired = true;
      }
    }

    if (isExpired) {
      expiredCodes.push(item.code);
      evaluatedItems.push({
        code: item.code,
        name: item.name,
        weight: item.weight,
        required: item.required,
        max_age_days: item.max_age_days,
        status: 'expired',
        documentId: doc.id,
        daysOld,
        isExpired: true,
      });
      continue;
    }

    // Valid and active
    if (item.required) {
      earnedWeight += item.weight;
    }

    evaluatedItems.push({
      code: item.code,
      name: item.name,
      weight: item.weight,
      required: item.required,
      max_age_days: item.max_age_days,
      status: 'verified',
      documentId: doc.id,
      daysOld,
      isExpired: false,
    });
  }

  const completenessRatio = totalRequiredWeight > 0 ? earnedWeight / totalRequiredWeight : 0;
  const completenessDec = toDecimal(completenessRatio.toString()).mul(100);
  const completenessPct = completenessDec.toFixed(2);

  return {
    completenessPct,
    earnedWeight,
    totalRequiredWeight,
    totalChecklistWeight,
    isComplete: earnedWeight === totalRequiredWeight && missingRequiredCodes.length === 0,
    items: evaluatedItems,
    missingRequiredCodes,
    expiredCodes,
  };
}

