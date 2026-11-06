import pg from 'pg';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key: string): string {
  const m = envContent.match(new RegExp(`${key}=(.*)`));
  return m ? m[1].trim() : '';
}

const supabaseUrl = getEnvVal('NEXT_PUBLIC_SUPABASE_URL');
const serviceKey = getEnvVal('SUPABASE_SERVICE_ROLE_KEY');
const dbUrl = getEnvVal('DIRECT_URL') || getEnvVal('DATABASE_URL') || getEnvVal('POSTGRES_URL');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = 'DemoPassword123!';

const DEMO_USERS = [
  {
    email: 'issuer@nivasa.demo',
    displayName: 'Devendra Sharma (Nivasa Realty)',
    role: 'issuer',
  },
  {
    email: 'verifier1@nivasa.demo',
    displayName: 'Anand Verma (Title Verifier)',
    role: 'verifier',
  },
  {
    email: 'verifier2@nivasa.demo',
    displayName: 'Pooja Kulkarni (Legal Compliance Verifier)',
    role: 'verifier',
  },
  {
    email: 'investor.eligible@nivasa.demo',
    displayName: 'Rahul Mehta (Eligible Investor)',
    role: 'investor',
    walletAddress: '0x0000000000000000000000000000000000ace2c6',
    walletVerified: true,
  },
  {
    email: 'investor.ineligible@nivasa.demo',
    displayName: 'Suresh Patel (Unverified Investor)',
    role: 'investor',
    walletAddress: null,
    walletVerified: false,
  },
  {
    email: 'admin@nivasa.demo',
    displayName: 'System Admin (Nivasa Ops)',
    role: 'admin',
  },
];

async function seed() {
  console.log('--- Starting Database & Auth Seed ---');
  const userMap: Record<string, string> = {};

  // 1. Create or retrieve users via Supabase Auth Admin
  for (const u of DEMO_USERS) {
    console.log(`Checking user: ${u.email}...`);
    const { data: listData } = await supabase.auth.admin.listUsers();
    let existingUser = listData?.users.find((user) => user.email === u.email);

    if (!existingUser) {
      console.log(`Creating user: ${u.email}...`);
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({
        email: u.email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: u.displayName },
      });
      if (createErr) throw createErr;
      existingUser = created.user;
    }
    userMap[u.role === 'verifier' && u.email.includes('2') ? 'verifier2' : u.role === 'verifier' ? 'verifier1' : u.role === 'investor' && u.walletVerified ? 'investor_eligible' : u.role === 'investor' ? 'investor_ineligible' : u.role] = existingUser.id;
  }

  console.log('Seeded User IDs:', userMap);

  // 2. Connect directly via pg to execute seed SQL
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Seed Profiles & Roles
    for (const u of DEMO_USERS) {
      const key = u.role === 'verifier' && u.email.includes('2') ? 'verifier2' : u.role === 'verifier' ? 'verifier1' : u.role === 'investor' && u.walletVerified ? 'investor_eligible' : u.role === 'investor' ? 'investor_ineligible' : u.role;
      const uid = userMap[key];

      await client.query(
        `INSERT INTO profiles (id, display_name, wallet_address, wallet_verified_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           display_name = EXCLUDED.display_name,
           wallet_address = EXCLUDED.wallet_address,
           wallet_verified_at = EXCLUDED.wallet_verified_at`,
        [uid, u.displayName, u.walletAddress || null, u.walletVerified ? new Date() : null]
      );

      // Call grant_role
      await client.query('SELECT grant_role($1, $2)', [uid, u.role]);
    }

    const issuerId = userMap['issuer'];
    const verifier1Id = userMap['verifier1'];
    const verifier2Id = userMap['verifier2'];
    const eligibleInvestorId = userMap['investor_eligible'];

    // 3. Seed Property (Godrej Platina, Vikhroli West)
    const propertyId = '11111111-1111-1111-1111-111111111111';
    await client.query(
      `INSERT INTO properties (
         id, issuer_id, name, description, city, locality, property_type,
         normalized_address, parcel_ref_hmac, built_up_area_sqm, rr_zone_ref,
         status, verification_status, is_demo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'verified', 'verified', true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         status = 'verified',
         verification_status = 'verified'`,
      [
        propertyId,
        issuerId,
        'Godrej Platina Commercial Wing A',
        'Fictional Mumbai commercial real estate asset for ETHGlobal Mumbai lifecycle prototype',
        'Mumbai',
        'Vikhroli West',
        'Commercial Office',
        'Wing A, Godrej Platina, LBS Marg, Vikhroli West, Mumbai, Maharashtra 400079',
        'hmac_sha256_mumbai_vikhroli_001',
        1450.0,
        'MH-MUM-VKH-COMM-2026',
      ]
    );

    // 4. Seed Property Documents
    const docTypes = [
      { type: '7_12_EXTRACT', path: 'documents/evidence/7_12_vikhroli.pdf', hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
      { type: 'TITLE_SEARCH_REPORT', path: 'documents/evidence/title_search_30yr.pdf', hash: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0' },
      { type: 'ENCUMBRANCE_CERTIFICATE', path: 'documents/evidence/encumbrance_cert.pdf', hash: '123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0' },
      { type: 'OCCUPANCY_CERTIFICATE', path: 'documents/evidence/occupancy_cert.pdf', hash: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' },
      { type: 'FIRE_NOC', path: 'documents/evidence/fire_safety_noc.pdf', hash: 'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210' },
      { type: 'PROPERTY_TAX_RECEIPT', path: 'documents/evidence/property_tax_receipt.pdf', hash: '56789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234' },
      { type: 'REGISTERED_LEASE_DEED', path: 'documents/evidence/registered_lease.pdf', hash: '9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcb' },
    ];

    for (const d of docTypes) {
      await client.query(
        `INSERT INTO property_documents (
           property_id, document_type, private_storage_path, sha256_hash,
           mime_type, size_bytes, source_name, status, uploaded_by
         ) VALUES ($1, $2, $3, $4, 'application/pdf', 1048576, 'Sub-Registrar Vikhroli', 'active', $5)`,
        [propertyId, d.type, d.path, d.hash, issuerId]
      );
    }

    // 5. Seed Approved Evidence Manifest (SoD: approved_by = verifier1, distinct from issuer)
    const manifestId = '22222222-2222-2222-2222-222222222222';
    const merkleRoot = '0x933b32a8be928d0e6c32cf432e54c248f2b1ee8b4db617211c00a23040a2ac30';
    const onchainDocTx = '0.0.11330244@1793915457.630080662';

    await client.query(
      `INSERT INTO evidence_manifests (
         id, property_id, version, manifest_json, manifest_hash, merkle_root,
         checklist_completeness, status, created_by, approved_by, approved_at, onchain_doc_tx
       ) VALUES ($1, $2, 1, $3, $4, $5, 100.00, 'approved', $6, $7, now(), $8)
       ON CONFLICT (id) DO NOTHING`,
      [
        manifestId,
        propertyId,
        JSON.stringify({ propertyRef: 'PROPERTY-MH-001', documentsCount: 7 }),
        merkleRoot,
        merkleRoot,
        issuerId,
        verifier1Id,
        onchainDocTx,
      ]
    );

    // 6. Seed Property Verification Record (SoD: reviewer_id = verifier1)
    await client.query(
      `INSERT INTO property_verifications (
         property_id, manifest_id, review_stage, decision, reviewer_id,
         evidence_summary, limitations, policy_version
       ) VALUES ($1, $2, 'comprehensive_legal_audit', 'verified', $3, $4, $5, 'v1.0')`,
      [
        propertyId,
        manifestId,
        verifier1Id,
        JSON.stringify({ verifiedRecords: 7, completenessPct: 100 }),
        'Simulated title and revenue record verification for hackathon prototype',
      ]
    );

    // 7. Seed Property Snapshot
    await client.query(
      `INSERT INTO property_snapshots (
         property_id, snapshot_no, as_of, occupancy_pct, annual_rent_inr,
         operating_costs_inr, valuation_amount_inr, valuation_date, provenance,
         event_note, manifest_id, created_by
       ) VALUES ($1, 1, now(), 94.50, 21600000.00, 3240000.00, 240000000.00, '2026-10-01',
                 'independently_verified', 'Initial verified appraisal baseline', $2, $3)
       ON CONFLICT (property_id, snapshot_no) DO NOTHING`,
      [propertyId, manifestId, verifier1Id]
    );

    // 8. Seed Offering (Active offering linked to real Hedera ATS Asset 0.0.11330441)
    const offeringId = '33333333-3333-3333-3333-333333333333';
    await client.query(
      `INSERT INTO offerings (
         id, property_id, issuer_id, proposed_by, approved_by, token_name,
         token_symbol, asset_type, chain_id, ats_asset_ref, token_contract_id,
         token_evm_address, total_units, unit_price_inr, minimum_units,
         maximum_units_per_investor, status, current_rights_version, current_manifest_id,
         rights_doc_tx, manifest_doc_tx, configuration_hash
       ) VALUES ($1, $2, $3, $4, $5, 'NIVASA Commercial 001', 'PROPERTY-MH-001',
                 'COMMERCIAL_EQUITY', 296, 'PROPERTY-MH-001', '0.0.11330441',
                 '0x52ed835e649a4b045a21bc5e240623d8a77f73ef', 10000, 24000.00, 1, 500,
                 'active', 1, $6, '0.0.11330244@1793915456.826762270', $7, '0xconfig123')
       ON CONFLICT (id) DO UPDATE SET
         status = 'active',
         token_contract_id = '0.0.11330441',
         token_evm_address = '0x52ed835e649a4b045a21bc5e240623d8a77f73ef'`,
      [
        offeringId,
        propertyId,
        issuerId,
        issuerId,
        verifier1Id, // SoD: approved_by != proposed_by
        manifestId,
        onchainDocTx,
      ]
    );

    // 9. Seed Offering Rights v1
    const rightsHash = '0xe90e5435bef5c350191e2172b7acc3b57bed4c910234a9101f3e9836f7c53ec2';
    await client.query(
      `INSERT INTO offering_rights (
         offering_id, version, rights_type, rights_document_path, rights_document_hash,
         income_entitlement_rule, transfer_rule, redemption_rule, voting_or_control_rights,
         risk_disclosures, approved_by, approved_at
       ) VALUES ($1, 1, 'FRACTIONAL_COMMERCIAL_EQUITY', 'documents/offerings/rights-v1.pdf', $2,
                 'Quarterly proportional commercial rental net income distribution in INR',
                 'Transfers permitted exclusively between KYC-verified eligible investors on Hedera Testnet',
                 'Ten-year liquidity window with property appraisal sale exit',
                 'Non-voting fractional economic entitlement',
                 'Simulated prototype disclaimer: no guaranteed return, no legal title ownership claim',
                 $3, now())
       ON CONFLICT (offering_id, version) DO NOTHING`,
      [offeringId, rightsHash, verifier1Id]
    );

    // 10. Seed Investor Eligibility for Eligible Investor (SoD: reviewed_by = verifier2, != investor)
    await client.query(
      `INSERT INTO investor_eligibility (
         user_id, offering_id, status, policy_version, reviewed_by, valid_until,
         reason_code, chain_status
       ) VALUES ($1, $2, 'eligible', 'v1.0', $3, now() + interval '1 year', 'VERIFIED_KYC_ACCREDITED', 'registered')
       ON CONFLICT (user_id, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid))
       WHERE status IN ('pending', 'eligible')
       DO UPDATE SET
         status = 'eligible',
         chain_status = 'registered'`,
      [eligibleInvestorId, offeringId, verifier2Id]
    );

    await client.query('COMMIT');
    console.log('--- Seed Completed Successfully! ---');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed Error:', err);
    throw err;
  } finally {
    await client.end();
  }
}

seed().catch((err) => {
  console.error('Fatal seed failure:', err);
  process.exit(1);
});

