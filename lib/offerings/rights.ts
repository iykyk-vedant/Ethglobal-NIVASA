import { z } from 'zod';
import { sha256, canonicalStringify } from '@/lib/evidence/merkle';

export const RightsTermsSchema = z.object({
  offering_id: z.string().uuid(),
  version: z.number().int().positive(),
  rights_type: z.string().min(1).default('Commercial Fractional Economic Interest'),
  represents: z.string().min(1),
  does_not_represent: z.string().min(1),
  income_entitlement_rule: z.string().min(1),
  transfer_rule: z.string().min(1),
  redemption_rule: z.string().min(1),
  voting_or_control_rights: z.string().min(1),
  risk_disclosures: z.string().min(1),
  simulated_status: z.string().default('SIMULATED_DEMO_NON_LEGAL'),
});

export type RightsTerms = z.infer<typeof RightsTermsSchema>;

/**
 * Computes deterministic SHA-256 hash of rights terms in canonical JSON format.
 * Returns lowercase hex string prefixed with '0x' (32-byte bytes32 format for Hedera ATS).
 */
export function computeRightsDocumentHash(terms: RightsTerms): string {
  const canonical = canonicalStringify({
    offering_id: terms.offering_id,
    version: terms.version,
    rights_type: terms.rights_type,
    represents: terms.represents,
    does_not_represent: terms.does_not_represent,
    income_entitlement_rule: terms.income_entitlement_rule,
    transfer_rule: terms.transfer_rule,
    redemption_rule: terms.redemption_rule,
    voting_or_control_rights: terms.voting_or_control_rights,
    risk_disclosures: terms.risk_disclosures,
    simulated_status: terms.simulated_status,
  });

  const hash = sha256(Buffer.from(canonical, 'utf8'));
  return `0x${hash.toLowerCase()}`;
}

/**
 * Computes deterministic configuration hash for ATS asset configuration (ARCH §9.3, PLAN M9.2).
 */
export function computeConfigurationHash(config: {
  ats_asset_ref: string;
  token_contract_id: string;
  token_evm_address: string;
  chain_id: number;
  total_units: number | string;
  kyc_required: boolean;
  transfer_restricted: boolean;
}): string {
  const canonical = canonicalStringify({
    ats_asset_ref: config.ats_asset_ref,
    token_contract_id: config.token_contract_id,
    token_evm_address: config.token_evm_address.toLowerCase(),
    chain_id: config.chain_id,
    total_units: config.total_units.toString(),
    kyc_required: config.kyc_required,
    transfer_restricted: config.transfer_restricted,
  });

  const hash = sha256(Buffer.from(canonical, 'utf8'));
  return `0x${hash.toLowerCase()}`;
}
