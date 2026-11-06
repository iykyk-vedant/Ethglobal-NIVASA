-- ============================================================================
-- NIVASA Seed Data (Milestone M2)
-- Godrej Platina Commercial Wing A (PROPERTY-MH-001)
-- ============================================================================

-- Ensure demo property exists
INSERT INTO properties (
  id, issuer_id, name, description, city, locality, property_type,
  normalized_address, parcel_ref_hmac, built_up_area_sqm, rr_zone_ref,
  status, verification_status, is_demo
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'e7084862-05bb-4b40-911d-46c56b12f875', -- Devendra Sharma (Nivasa Realty)
  'Godrej Platina Commercial Wing A',
  'Fictional Mumbai commercial real estate asset for ETHGlobal Mumbai lifecycle prototype',
  'Mumbai',
  'Vikhroli West',
  'Commercial Office',
  'Wing A, Godrej Platina, LBS Marg, Vikhroli West, Mumbai, Maharashtra 400079',
  'hmac_sha256_mumbai_vikhroli_001',
  1450.0,
  'MH-MUM-VKH-COMM-2026',
  'verified',
  'verified',
  true
) ON CONFLICT (id) DO NOTHING;

-- Evidence Manifest v1 (Approved)
INSERT INTO evidence_manifests (
  id, property_id, version, manifest_json, manifest_hash, merkle_root,
  checklist_completeness, status, created_by, approved_by, approved_at, onchain_doc_tx
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  1,
  '{"propertyRef":"PROPERTY-MH-001","documentsCount":7}',
  '0x933b32a8be928d0e6c32cf432e54c248f2b1ee8b4db617211c00a23040a2ac30',
  '0x933b32a8be928d0e6c32cf432e54c248f2b1ee8b4db617211c00a23040a2ac30',
  100.00,
  'approved',
  'e7084862-05bb-4b40-911d-46c56b12f875', -- Issuer
  '1521f5eb-844c-4f21-85b3-b258c0e19fe4', -- Verifier 1 (SoD distinct)
  now(),
  '0.0.11330244@1793915457.630080662'
) ON CONFLICT (id) DO NOTHING;

-- Initial Baseline Property Snapshot
INSERT INTO property_snapshots (
  property_id, snapshot_no, as_of, occupancy_pct, annual_rent_inr,
  operating_costs_inr, valuation_amount_inr, valuation_date, provenance,
  event_note, manifest_id, created_by
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  1,
  now(),
  94.50,
  21600000.00,
  3240000.00,
  240000000.00,
  '2026-10-01',
  'independently_verified',
  'Initial verified appraisal baseline',
  '22222222-2222-2222-2222-222222222222',
  '1521f5eb-844c-4f21-85b3-b258c0e19fe4'
) ON CONFLICT (property_id, snapshot_no) DO NOTHING;

-- Active Commercial Offering (Hedera ATS Diamond Asset 0.0.11330441)
INSERT INTO offerings (
  id, property_id, issuer_id, proposed_by, approved_by, token_name,
  token_symbol, asset_type, chain_id, ats_asset_ref, token_contract_id,
  token_evm_address, total_units, unit_price_inr, minimum_units,
  maximum_units_per_investor, status, current_rights_version, current_manifest_id,
  rights_doc_tx, manifest_doc_tx, configuration_hash
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'e7084862-05bb-4b40-911d-46c56b12f875', -- Issuer
  'e7084862-05bb-4b40-911d-46c56b12f875', -- Proposer
  '1521f5eb-844c-4f21-85b3-b258c0e19fe4', -- Approver (Verifier 1, SoD distinct)
  'NIVASA Commercial 001',
  'PROPERTY-MH-001',
  'COMMERCIAL_EQUITY',
  296,
  'PROPERTY-MH-001',
  '0.0.11330441',
  '0x52ed835e649a4b045a21bc5e240623d8a77f73ef',
  10000,
  24000.00,
  1,
  500,
  'active',
  1,
  '22222222-2222-2222-2222-222222222222',
  '0.0.11330244@1793915456.826762270',
  '0.0.11330244@1793915457.630080662',
  '0xconfig123'
) ON CONFLICT (id) DO NOTHING;

-- Offering Rights v1
INSERT INTO offering_rights (
  offering_id, version, rights_type, rights_document_path, rights_document_hash,
  income_entitlement_rule, transfer_rule, redemption_rule, voting_or_control_rights,
  risk_disclosures, approved_by, approved_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  1,
  'FRACTIONAL_COMMERCIAL_EQUITY',
  'documents/offerings/rights-v1.pdf',
  '0xe90e5435bef5c350191e2172b7acc3b57bed4c910234a9101f3e9836f7c53ec2',
  'Quarterly proportional commercial rental net income distribution in INR',
  'Transfers permitted exclusively between KYC-verified eligible investors on Hedera Testnet',
  'Ten-year liquidity window with property appraisal sale exit',
  'Non-voting fractional economic entitlement',
  'Simulated prototype disclaimer: no guaranteed return, no legal title ownership claim',
  '1521f5eb-844c-4f21-85b3-b258c0e19fe4',
  now()
) ON CONFLICT (offering_id, version) DO NOTHING;

