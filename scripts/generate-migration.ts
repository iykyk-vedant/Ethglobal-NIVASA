import fs from 'fs';
import { generateAllowedTransitionsSql, generateSqlCheckConstraint } from '../lib/state/transitions';

const allowedTransitionsSeed = generateAllowedTransitionsSql();

const propertyStatusCheck = generateSqlCheckConstraint('property', 'status');
const manifestStatusCheck = generateSqlCheckConstraint('manifest', 'status');
const offeringStatusCheck = generateSqlCheckConstraint('offering', 'status');
const orderStatusCheck = generateSqlCheckConstraint('order', 'status');

const sql = `-- ============================================================================
-- NIVASA Core Schema & Integrity Migration
-- ARCH §4.1, §6.4, §9, §17, §18 · PRD §3, §9, §11 · PLAN M2
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. STATE TRANSITIONS REGISTRY (Single source of truth from lib/state/transitions.ts)
CREATE TABLE IF NOT EXISTS allowed_transitions (
  entity_type text NOT NULL,
  from_status text NOT NULL,
  to_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, from_status, to_status)
);

-- Seed allowed transitions
${allowedTransitionsSeed}

-- Transition validation trigger function
CREATE OR REPLACE FUNCTION check_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entity text;
BEGIN
  v_entity := TG_ARGV[0];
  IF OLD.status IS NOT NULL AND NEW.status IS NOT NULL AND OLD.status <> NEW.status THEN
    IF NOT EXISTS (
      SELECT 1 FROM allowed_transitions
       WHERE entity_type = v_entity
         AND from_status = OLD.status
         AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'INVALID_STATE_TRANSITION: Cannot transition % from % to %',
        v_entity, OLD.status, NEW.status
        USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. IDENTITY AND ELIGIBILITY TABLES

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  wallet_address text UNIQUE,
  wallet_verified_at timestamptz,
  wallet_nonce text,
  wallet_nonce_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles (issuer, verifier, investor, admin)
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('issuer', 'verifier', 'investor', 'admin')),
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

-- Partial unique index on active role: only one active instance of a role per user
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_roles_active
  ON user_roles (user_id, role)
  WHERE revoked_at IS NULL;

-- Investor Eligibility
CREATE TABLE IF NOT EXISTS investor_eligibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offering_id uuid, -- nullable for global tier check or specific offering
  status text NOT NULL CHECK (status IN ('pending', 'eligible', 'ineligible', 'expired', 'revoked')),
  policy_version text NOT NULL DEFAULT 'v1.0',
  reviewed_by uuid REFERENCES auth.users(id),
  valid_until timestamptz,
  reason_code text,
  chain_status text NOT NULL DEFAULT 'not_registered' CHECK (chain_status IN ('not_registered', 'registered', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_eligibility_reviewer_not_user CHECK (reviewed_by IS NULL OR reviewed_by <> user_id)
);

-- Partial unique index: one active pending/eligible per (user_id, offering_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_investor_eligibility_active
  ON investor_eligibility (user_id, coalesce(offering_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('pending', 'eligible');

-- 4. PROPERTY AND EVIDENCE TABLES

-- Properties
CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issuer_id uuid NOT NULL REFERENCES auth.users(id),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  city text NOT NULL,
  locality text NOT NULL,
  property_type text NOT NULL,
  normalized_address text NOT NULL,
  parcel_ref_hmac text,
  built_up_area_sqm numeric(10,2) NOT NULL,
  rr_zone_ref text,
  status text NOT NULL DEFAULT 'draft' CHECK (${propertyStatusCheck}),
  verification_status text NOT NULL DEFAULT 'draft' CHECK (verification_status IN ('draft', 'submitted', 'in_review', 'verified', 'rejected', 'needs_more_information')),
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Property Documents
CREATE TABLE IF NOT EXISTS property_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  private_storage_path text NOT NULL,
  sha256_hash text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  source_name text,
  source_reference text,
  issued_at timestamptz,
  valid_until timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'disputed', 'rejected')),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  superseded_by uuid REFERENCES property_documents(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Evidence Manifests
CREATE TABLE IF NOT EXISTS evidence_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  version integer NOT NULL,
  manifest_json jsonb NOT NULL,
  manifest_hash text NOT NULL,
  merkle_root text NOT NULL,
  checklist_completeness numeric(5,2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'draft' CHECK (${manifestStatusCheck}),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  onchain_doc_tx text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_manifest_property_version
  ON evidence_manifests (property_id, version);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_manifest_one_approved
  ON evidence_manifests (property_id)
  WHERE status = 'approved';

-- Property Verifications
CREATE TABLE IF NOT EXISTS property_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  manifest_id uuid NOT NULL REFERENCES evidence_manifests(id),
  review_stage text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('verified', 'rejected', 'needs_more_information')),
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  evidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  limitations text,
  policy_version text NOT NULL DEFAULT 'v1.0',
  decided_at timestamptz NOT NULL DEFAULT now(),
  supersedes_id uuid REFERENCES property_verifications(id)
);

-- Property Snapshots (Append-only)
CREATE TABLE IF NOT EXISTS property_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  snapshot_no integer NOT NULL,
  as_of timestamptz NOT NULL,
  occupancy_pct numeric(5,2) NOT NULL,
  annual_rent_inr numeric(20,2) NOT NULL,
  operating_costs_inr numeric(20,2) NOT NULL,
  valuation_amount_inr numeric(20,2) NOT NULL,
  valuation_date date NOT NULL,
  provenance text NOT NULL CHECK (provenance IN ('independently_verified', 'issuer_reported', 'public_source', 'simulated', 'unknown')),
  event_note text,
  manifest_id uuid REFERENCES evidence_manifests(id),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_snapshots_no
  ON property_snapshots (property_id, snapshot_no);

-- 5. OFFERINGS AND RIGHTS TABLES

-- Offerings
CREATE TABLE IF NOT EXISTS offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  issuer_id uuid NOT NULL REFERENCES auth.users(id),
  proposed_by uuid NOT NULL REFERENCES auth.users(id),
  approved_by uuid REFERENCES auth.users(id),
  token_name text NOT NULL,
  token_symbol text NOT NULL,
  asset_type text NOT NULL DEFAULT 'COMMERCIAL_EQUITY',
  chain_id integer NOT NULL DEFAULT 296,
  ats_asset_ref text NOT NULL,
  token_contract_id text,
  token_evm_address text,
  total_units bigint NOT NULL CHECK (total_units > 0),
  unit_price_inr numeric(20,2) NOT NULL CHECK (unit_price_inr > 0),
  minimum_units bigint NOT NULL DEFAULT 1 CHECK (minimum_units > 0),
  maximum_units_per_investor bigint,
  status text NOT NULL DEFAULT 'draft' CHECK (${offeringStatusCheck}),
  paused_reason text,
  current_rights_version integer NOT NULL DEFAULT 1,
  current_manifest_id uuid REFERENCES evidence_manifests(id),
  rights_doc_tx text,
  manifest_doc_tx text,
  configuration_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_offering_approver_not_proposer CHECK (approved_by IS NULL OR approved_by <> proposed_by)
);

-- Offering Rights (Versioned legal term wrapper)
CREATE TABLE IF NOT EXISTS offering_rights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offering_id uuid NOT NULL REFERENCES offerings(id) ON DELETE CASCADE,
  version integer NOT NULL,
  rights_type text NOT NULL,
  rights_document_path text NOT NULL,
  rights_document_hash text NOT NULL,
  income_entitlement_rule text NOT NULL,
  transfer_rule text NOT NULL,
  redemption_rule text NOT NULL,
  voting_or_control_rights text NOT NULL,
  risk_disclosures text NOT NULL,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_offering_rights_version
  ON offering_rights (offering_id, version);

-- 6. SETTLEMENT TABLES

-- Investment Orders
CREATE TABLE IF NOT EXISTS investment_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  receipt_token text UNIQUE NOT NULL,
  investor_id uuid NOT NULL REFERENCES auth.users(id),
  offering_id uuid NOT NULL REFERENCES offerings(id),
  units bigint NOT NULL CHECK (units > 0),
  unit_price_inr numeric(20,2) NOT NULL,
  amount_inr numeric(20,2) NOT NULL,
  rights_version integer NOT NULL,
  rights_document_hash text NOT NULL,
  ack_message text NOT NULL,
  ack_signature text NOT NULL,
  ack_wallet text NOT NULL,
  status text NOT NULL DEFAULT 'UNITS_RESERVED' CHECK (${orderStatusCheck}),
  eligibility_snapshot jsonb,
  simulated_payment_ref text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Allocation Attempts (Retries add rows; history immutable)
CREATE TABLE IF NOT EXISTS allocation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES investment_orders(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL,
  chain_tx_id text,
  signed_tx_hash text,
  status text NOT NULL CHECK (status IN ('prepared', 'submitted', 'confirmed', 'failed', 'unknown')),
  error text,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  consensus_timestamp text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_allocation_attempts_no
  ON allocation_attempts (order_id, attempt_no);

CREATE UNIQUE INDEX IF NOT EXISTS uq_allocation_attempts_one_confirmed
  ON allocation_attempts (order_id)
  WHERE status = 'confirmed';

-- Outbox Jobs
CREATE TABLE IF NOT EXISTS outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  dedupe_key text NOT NULL,
  order_id uuid REFERENCES investment_orders(id),
  offering_id uuid REFERENCES offerings(id),
  property_id uuid REFERENCES properties(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed', 'dead')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  locked_by text,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_outbox_jobs_type_dedupe
  ON outbox_jobs (type, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_outbox_jobs_status_run
  ON outbox_jobs (status, next_run_at);

-- 7. AI AND AUDIT TABLES

-- AI Episodes (0G Private Computer inference records)
CREATE TABLE IF NOT EXISTS ai_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid REFERENCES auth.users(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  snapshot_from integer NOT NULL,
  snapshot_to integer NOT NULL,
  request_id text NOT NULL,
  provider text NOT NULL DEFAULT '0g',
  model_name text NOT NULL,
  model_version text,
  input_hash text NOT NULL,
  output_hash text NOT NULL,
  input_snapshot jsonb NOT NULL,
  deterministic_metrics jsonb NOT NULL,
  validated_response jsonb NOT NULL,
  request_attempts jsonb NOT NULL DEFAULT '[]'::jsonb,
  benchmark_snapshot_hash text,
  previous_episode_id uuid REFERENCES ai_episodes(id),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'repaired')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_episodes_lookup
  ON ai_episodes (investor_id, property_id, input_hash);

-- Audit Logs (Hash-chained append-only log)
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid REFERENCES auth.users(id),
  actor_wallet text,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  before_hash text,
  after_hash text,
  reason text,
  prev_hash text NOT NULL,
  row_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Revoke mutation privileges on audit_logs from app roles
REVOKE UPDATE, DELETE, TRUNCATE ON audit_logs FROM public, anon, authenticated;

-- 8. INTEGRITY TRIGGERS

-- Trigger: Allowed transitions on properties
DROP TRIGGER IF EXISTS trg_properties_state_transition ON properties;
CREATE TRIGGER trg_properties_state_transition
  BEFORE UPDATE OF status ON properties
  FOR EACH ROW
  EXECUTE FUNCTION check_state_transition('property');

-- Trigger: Allowed transitions on evidence_manifests
DROP TRIGGER IF EXISTS trg_manifests_state_transition ON evidence_manifests;
CREATE TRIGGER trg_manifests_state_transition
  BEFORE UPDATE OF status ON evidence_manifests
  FOR EACH ROW
  EXECUTE FUNCTION check_state_transition('manifest');

-- Trigger: Allowed transitions on offerings
DROP TRIGGER IF EXISTS trg_offerings_state_transition ON offerings;
CREATE TRIGGER trg_offerings_state_transition
  BEFORE UPDATE OF status ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION check_state_transition('offering');

-- Trigger: Allowed transitions on investment_orders
DROP TRIGGER IF EXISTS trg_orders_state_transition ON investment_orders;
CREATE TRIGGER trg_orders_state_transition
  BEFORE UPDATE OF status ON investment_orders
  FOR EACH ROW
  EXECUTE FUNCTION check_state_transition('order');

-- Trigger: Derived property verification_status
CREATE OR REPLACE FUNCTION derive_property_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE properties
     SET verification_status = NEW.decision,
         status = CASE
           WHEN NEW.decision = 'verified' THEN 'verified'
           WHEN NEW.decision = 'rejected' THEN 'rejected'
           WHEN NEW.decision = 'needs_more_information' THEN 'needs_more_information'
           ELSE status
         END,
         updated_at = now()
   WHERE id = NEW.property_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_derive_property_verification ON property_verifications;
CREATE TRIGGER trg_derive_property_verification
  AFTER INSERT OR UPDATE OF decision ON property_verifications
  FOR EACH ROW
  EXECUTE FUNCTION derive_property_verification();

-- Trigger: Separation of Duties (SoD) Checks
CREATE OR REPLACE FUNCTION check_sod_property_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issuer_id uuid;
BEGIN
  SELECT issuer_id INTO v_issuer_id FROM properties WHERE id = NEW.property_id;
  IF NEW.reviewer_id = v_issuer_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: Manifest reviewer cannot be the property issuer'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sod_verifications ON property_verifications;
CREATE TRIGGER trg_sod_verifications
  BEFORE INSERT OR UPDATE ON property_verifications
  FOR EACH ROW
  EXECUTE FUNCTION check_sod_property_verification();

CREATE OR REPLACE FUNCTION check_sod_evidence_manifest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issuer_id uuid;
BEGIN
  IF NEW.approved_by IS NOT NULL THEN
    SELECT issuer_id INTO v_issuer_id FROM properties WHERE id = NEW.property_id;
    IF NEW.approved_by = v_issuer_id THEN
      RAISE EXCEPTION 'SOD_VIOLATION: Manifest approver cannot be the property issuer'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sod_manifests ON evidence_manifests;
CREATE TRIGGER trg_sod_manifests
  BEFORE INSERT OR UPDATE OF approved_by ON evidence_manifests
  FOR EACH ROW
  EXECUTE FUNCTION check_sod_evidence_manifest();

CREATE OR REPLACE FUNCTION check_sod_offering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.approved_by IS NOT NULL AND NEW.approved_by = NEW.proposed_by THEN
    RAISE EXCEPTION 'SOD_VIOLATION: Offering approver cannot be the proposer'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sod_offerings ON offerings;
CREATE TRIGGER trg_sod_offerings
  BEFORE INSERT OR UPDATE OF approved_by ON offerings
  FOR EACH ROW
  EXECUTE FUNCTION check_sod_offering();

CREATE OR REPLACE FUNCTION check_sod_investor_eligibility()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.reviewed_by IS NOT NULL AND NEW.reviewed_by = NEW.user_id THEN
    RAISE EXCEPTION 'SOD_VIOLATION: Eligibility reviewer cannot review own eligibility'
      USING ERRCODE = 'P0002';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sod_eligibility ON investor_eligibility;
CREATE TRIGGER trg_sod_eligibility
  BEFORE INSERT OR UPDATE OF reviewed_by ON investor_eligibility
  FOR EACH ROW
  EXECUTE FUNCTION check_sod_investor_eligibility();

-- Trigger: Immutability of approved manifests
CREATE OR REPLACE FUNCTION enforce_manifest_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('approved', 'superseded') THEN
      RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Approved manifest status cannot transition to %', NEW.status
        USING ERRCODE = 'P0003';
    END IF;
    -- Content columns cannot be altered once approved
    IF NEW.manifest_json <> OLD.manifest_json OR
       NEW.manifest_hash <> OLD.manifest_hash OR
       NEW.merkle_root <> OLD.merkle_root OR
       NEW.version <> OLD.version THEN
      RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Content of an approved manifest cannot be altered'
        USING ERRCODE = 'P0003';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_manifest_immutability ON evidence_manifests;
CREATE TRIGGER trg_manifest_immutability
  BEFORE UPDATE ON evidence_manifests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_manifest_immutability();

-- Trigger: Immutability of property snapshots (append-only)
CREATE OR REPLACE FUNCTION enforce_snapshot_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: property_snapshots table is append-only'
    USING ERRCODE = 'P0003';
END;
$$;

DROP TRIGGER IF EXISTS trg_snapshot_immutability ON property_snapshots;
CREATE TRIGGER trg_snapshot_immutability
  BEFORE UPDATE OR DELETE ON property_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION enforce_snapshot_immutability();

-- 9. AUDIT APPEND FUNCTION (Advisory lock + Hash Chain)
CREATE OR REPLACE FUNCTION audit_append(
  p_actor_user_id uuid,
  p_actor_wallet text,
  p_action text,
  p_resource_type text,
  p_resource_id text,
  p_before_hash text,
  p_after_hash text,
  p_reason text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_prev_hash text;
  v_row_hash text;
  v_new_id bigint;
  v_canonical_data text;
  v_now timestamptz;
BEGIN
  -- Obtain advisory xact lock on the audit chain (key = 1844917)
  PERFORM pg_advisory_xact_lock(1844917);

  -- Retrieve latest row_hash as prev_hash (genesis fallback)
  SELECT row_hash INTO v_prev_hash
    FROM audit_logs
   ORDER BY id DESC
   LIMIT 1;

  IF v_prev_hash IS NULL THEN
    v_prev_hash := '0000000000000000000000000000000000000000000000000000000000000000';
  END IF;

  v_now := now();

  -- Canonical row string: prev_hash || actor || action || resource_type || resource_id || after_hash || timestamp
  v_canonical_data := v_prev_hash ||
                      coalesce(p_actor_user_id::text, '') ||
                      coalesce(p_actor_wallet, '') ||
                      p_action ||
                      p_resource_type ||
                      p_resource_id ||
                      coalesce(p_before_hash, '') ||
                      coalesce(p_after_hash, '') ||
                      to_char(v_now, 'YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"');

  v_row_hash := encode(digest(v_canonical_data::bytea, 'sha256'), 'hex');

  INSERT INTO audit_logs (
    actor_user_id, actor_wallet, action, resource_type, resource_id,
    before_hash, after_hash, reason, prev_hash, row_hash, created_at
  ) VALUES (
    p_actor_user_id, p_actor_wallet, p_action, p_resource_type, p_resource_id,
    p_before_hash, p_after_hash, p_reason, v_prev_hash, v_row_hash, v_now
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 10. ATOMIC SETTLEMENT FUNCTIONS (ARCH §17.4)

CREATE OR REPLACE FUNCTION counts_against_supply(s text, exp timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT s IN ('PAYMENT_CONFIRMED','ALLOCATION_PENDING','ALLOCATION_SUBMITTED',
               'ALLOCATION_CONFIRMED','COMPLETED','ALLOCATION_FAILED',
               'REFUND_PENDING','RECONCILIATION_REQUIRED','MANUAL_REVIEW')
      OR (s IN ('UNITS_RESERVED','PAYMENT_PENDING') AND exp > now());
$$;

CREATE OR REPLACE FUNCTION reserve_units(
  p_key text,
  p_investor uuid,
  p_offering uuid,
  p_units bigint,
  p_ack_message text,
  p_ack_signature text,
  p_ttl interval DEFAULT interval '15 minutes'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  o offerings%rowtype;
  pr profiles%rowtype;
  v_existing uuid;
  v_held bigint;
  v_mine bigint;
  v_order uuid;
BEGIN
  -- Lock the offering row to serialize concurrent reservations
  SELECT * INTO o FROM offerings WHERE id = p_offering FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'OFFERING_NOT_FOUND' USING ERRCODE = 'P0004'; END IF;
  IF o.status = 'paused_evidence_drift' THEN RAISE EXCEPTION 'OFFERING_PAUSED_EVIDENCE' USING ERRCODE = 'P0004'; END IF;
  IF o.status <> 'active' THEN RAISE EXCEPTION 'OFFERING_NOT_ACTIVE' USING ERRCODE = 'P0004'; END IF;

  -- Idempotency check after lock
  SELECT id INTO v_existing FROM investment_orders WHERE idempotency_key = p_key;
  IF FOUND THEN RETURN v_existing; END IF;

  IF p_units < o.minimum_units THEN RAISE EXCEPTION 'BELOW_MINIMUM' USING ERRCODE = 'P0004'; END IF;

  SELECT * INTO pr FROM profiles WHERE id = p_investor;
  IF pr.wallet_verified_at IS NULL THEN RAISE EXCEPTION 'WALLET_NOT_VERIFIED' USING ERRCODE = 'P0004'; END IF;

  -- Atomic eligibility & registration check
  PERFORM 1 FROM investor_eligibility
   WHERE user_id = p_investor
     AND (offering_id = p_offering OR offering_id IS NULL)
     AND status = 'eligible'
     AND (valid_until IS NULL OR valid_until > now())
     AND chain_status = 'registered';
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ELIGIBLE' USING ERRCODE = 'P0004'; END IF;

  -- Global remaining supply check
  SELECT coalesce(sum(units),0) INTO v_held FROM investment_orders
   WHERE offering_id = p_offering AND counts_against_supply(status, expires_at);
  IF v_held + p_units > o.total_units THEN RAISE EXCEPTION 'INSUFFICIENT_UNITS' USING ERRCODE = 'P0004'; END IF;

  -- Per-investor limit check
  SELECT coalesce(sum(units),0) INTO v_mine FROM investment_orders
   WHERE offering_id = p_offering AND investor_id = p_investor
     AND counts_against_supply(status, expires_at);
  IF o.maximum_units_per_investor IS NOT NULL
     AND v_mine + p_units > o.maximum_units_per_investor THEN
    RAISE EXCEPTION 'ABOVE_INVESTOR_MAX' USING ERRCODE = 'P0004';
  END IF;

  INSERT INTO investment_orders (
    idempotency_key, receipt_token, investor_id, offering_id,
    units, unit_price_inr, amount_inr, rights_version, rights_document_hash,
    ack_message, ack_signature, ack_wallet, status, expires_at
  )
  SELECT p_key, encode(gen_random_bytes(16), 'hex'), p_investor, p_offering, p_units,
         o.unit_price_inr, (p_units::numeric * o.unit_price_inr), r.version, r.rights_document_hash,
         p_ack_message, p_ack_signature, pr.wallet_address,
         'PAYMENT_PENDING', now() + p_ttl
    FROM offering_rights r
   WHERE r.offering_id = p_offering AND r.version = o.current_rights_version
  RETURNING id INTO v_order;

  RETURN v_order;
END;
$$;

-- 11. PUBLIC OFFERING VIEW (ARCH §17.5, §13)
CREATE OR REPLACE FUNCTION public_offering_view(p_offering_id uuid)
RETURNS TABLE (
  id uuid,
  property_id uuid,
  token_name text,
  token_symbol text,
  asset_type text,
  chain_id integer,
  ats_asset_ref text,
  token_contract_id text,
  token_evm_address text,
  total_units bigint,
  unit_price_inr numeric(20,2),
  minimum_units bigint,
  maximum_units_per_investor bigint,
  status text,
  current_rights_version integer,
  current_manifest_id uuid,
  rights_doc_tx text,
  manifest_doc_tx text,
  configuration_hash text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT o.id, o.property_id, o.token_name, o.token_symbol, o.asset_type,
         o.chain_id, o.ats_asset_ref, o.token_contract_id, o.token_evm_address,
         o.total_units, o.unit_price_inr, o.minimum_units, o.maximum_units_per_investor,
         o.status, o.current_rights_version, o.current_manifest_id,
         o.rights_doc_tx, o.manifest_doc_tx, o.configuration_hash, o.created_at
    FROM offerings o
   WHERE o.id = p_offering_id;
$$;

-- 12. ROLE MANAGEMENT (Server-only function)
CREATE OR REPLACE FUNCTION grant_role(
  p_user_id uuid,
  p_role text,
  p_granted_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF p_role NOT IN ('issuer', 'verifier', 'investor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role USING ERRCODE = 'P0005';
  END IF;

  -- Revoke any existing active role of this type first
  UPDATE user_roles
     SET revoked_at = now()
   WHERE user_id = p_user_id AND role = p_role AND revoked_at IS NULL;

  INSERT INTO user_roles (user_id, role, granted_by, granted_at)
  VALUES (p_user_id, p_role, p_granted_by, now())
  RETURNING id INTO v_role_id;

  RETURN v_role_id;
END;
$$;

-- 13. ROW LEVEL SECURITY (RLS) POLICIES (ARCH §18)

-- Enable RLS on all 15 tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering_rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check current user active role
CREATE OR REPLACE FUNCTION has_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
     WHERE user_id = auth.uid()
       AND role = p_role
       AND revoked_at IS NULL
  );
$$;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles readable by self or verifiers/admin" ON profiles;
CREATE POLICY "Profiles readable by self or verifiers/admin" ON profiles
  FOR SELECT USING (auth.uid() = id OR has_role('verifier') OR has_role('admin'));

DROP POLICY IF EXISTS "Profiles updatable only by self" ON profiles;
CREATE POLICY "Profiles updatable only by self" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles insertable on signup" ON profiles;
CREATE POLICY "Profiles insertable on signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies (Read only for self; writes strictly via grant_role)
DROP POLICY IF EXISTS "User roles readable by self and admin" ON user_roles;
CREATE POLICY "User roles readable by self and admin" ON user_roles
  FOR SELECT USING (auth.uid() = user_id OR has_role('admin'));

-- Investor eligibility policies
DROP POLICY IF EXISTS "Eligibility readable by investor and verifiers/admin" ON investor_eligibility;
CREATE POLICY "Eligibility readable by investor and verifiers/admin" ON investor_eligibility
  FOR SELECT USING (auth.uid() = user_id OR has_role('verifier') OR has_role('admin'));

DROP POLICY IF EXISTS "Eligibility insertable by investor" ON investor_eligibility;
CREATE POLICY "Eligibility insertable by investor" ON investor_eligibility
  FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "Eligibility updatable only by verifiers" ON investor_eligibility;
CREATE POLICY "Eligibility updatable only by verifiers" ON investor_eligibility
  FOR UPDATE USING (has_role('verifier') OR has_role('admin'))
  WITH CHECK (has_role('verifier') OR has_role('admin'));

-- Properties policies
DROP POLICY IF EXISTS "Properties readable if verified, or owned by issuer, or by verifier/admin" ON properties;
CREATE POLICY "Properties readable if verified, or owned by issuer, or by verifier/admin" ON properties
  FOR SELECT USING (
    status = 'verified' OR
    (auth.uid() = issuer_id AND has_role('issuer')) OR
    has_role('verifier') OR
    has_role('admin')
  );

DROP POLICY IF EXISTS "Properties insertable by issuers" ON properties;
CREATE POLICY "Properties insertable by issuers" ON properties
  FOR INSERT WITH CHECK (auth.uid() = issuer_id AND has_role('issuer'));

DROP POLICY IF EXISTS "Properties updatable by issuer in draft or needs_more_information" ON properties;
CREATE POLICY "Properties updatable by issuer in draft or needs_more_information" ON properties
  FOR UPDATE USING (auth.uid() = issuer_id AND status IN ('draft', 'needs_more_information'))
  WITH CHECK (auth.uid() = issuer_id);

-- Property documents policies
DROP POLICY IF EXISTS "Documents readable by property issuer and verifiers/admin" ON property_documents;
CREATE POLICY "Documents readable by property issuer and verifiers/admin" ON property_documents
  FOR SELECT USING (
    has_role('verifier') OR
    has_role('admin') OR
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.issuer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Documents insertable by property issuer" ON property_documents;
CREATE POLICY "Documents insertable by property issuer" ON property_documents
  FOR INSERT WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.issuer_id = auth.uid())
  );

-- Evidence manifests policies
DROP POLICY IF EXISTS "Manifests readable if approved or by issuer/verifier/admin" ON evidence_manifests;
CREATE POLICY "Manifests readable if approved or by issuer/verifier/admin" ON evidence_manifests
  FOR SELECT USING (
    status = 'approved' OR
    has_role('verifier') OR
    has_role('admin') OR
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.issuer_id = auth.uid())
  );

DROP POLICY IF EXISTS "Manifests insertable by issuer" ON evidence_manifests;
CREATE POLICY "Manifests insertable by issuer" ON evidence_manifests
  FOR INSERT WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (SELECT 1 FROM properties p WHERE p.id = property_id AND p.issuer_id = auth.uid())
  );

-- Property verifications policies
DROP POLICY IF EXISTS "Verifications readable by all authenticated" ON property_verifications;
CREATE POLICY "Verifications readable by all authenticated" ON property_verifications
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Verifications insertable only by verifiers" ON property_verifications;
CREATE POLICY "Verifications insertable only by verifiers" ON property_verifications
  FOR INSERT WITH CHECK (has_role('verifier') AND reviewer_id = auth.uid());

-- Property snapshots policies (Append-only by verifiers or admin, readable by all)
DROP POLICY IF EXISTS "Snapshots readable by all authenticated" ON property_snapshots;
CREATE POLICY "Snapshots readable by all authenticated" ON property_snapshots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Snapshots insertable by verifiers and admin" ON property_snapshots;
CREATE POLICY "Snapshots insertable by verifiers and admin" ON property_snapshots
  FOR INSERT WITH CHECK (has_role('verifier') OR has_role('admin'));

-- Offerings policies
DROP POLICY IF EXISTS "Offerings readable by public when active or by issuer/admin/verifier" ON offerings;
CREATE POLICY "Offerings readable by public when active or by issuer/admin/verifier" ON offerings
  FOR SELECT USING (
    status IN ('active', 'paused', 'paused_evidence_drift', 'closed') OR
    auth.uid() = issuer_id OR
    has_role('verifier') OR
    has_role('admin')
  );

DROP POLICY IF EXISTS "Offerings insertable by issuers" ON offerings;
CREATE POLICY "Offerings insertable by issuers" ON offerings
  FOR INSERT WITH CHECK (auth.uid() = issuer_id AND has_role('issuer'));

DROP POLICY IF EXISTS "Offerings updatable by issuer in draft" ON offerings;
CREATE POLICY "Offerings updatable by issuer in draft" ON offerings
  FOR UPDATE USING (auth.uid() = issuer_id AND status = 'draft')
  WITH CHECK (auth.uid() = issuer_id);

-- Offering rights policies
DROP POLICY IF EXISTS "Rights readable by all authenticated" ON offering_rights;
CREATE POLICY "Rights readable by all authenticated" ON offering_rights
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Rights insertable by issuer" ON offering_rights;
CREATE POLICY "Rights insertable by issuer" ON offering_rights
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM offerings o WHERE o.id = offering_id AND o.issuer_id = auth.uid())
  );

-- Investment orders policies
DROP POLICY IF EXISTS "Orders readable only by investor or admin" ON investment_orders;
CREATE POLICY "Orders readable only by investor or admin" ON investment_orders
  FOR SELECT USING (auth.uid() = investor_id OR has_role('admin'));

DROP POLICY IF EXISTS "Orders insertable by investor" ON investment_orders;
CREATE POLICY "Orders insertable by investor" ON investment_orders
  FOR INSERT WITH CHECK (auth.uid() = investor_id);

-- Allocation attempts policies
DROP POLICY IF EXISTS "Attempts readable by order investor or admin" ON allocation_attempts;
CREATE POLICY "Attempts readable by order investor or admin" ON allocation_attempts
  FOR SELECT USING (
    has_role('admin') OR
    EXISTS (SELECT 1 FROM investment_orders o WHERE o.id = order_id AND o.investor_id = auth.uid())
  );

-- Outbox jobs policies (Strictly internal / service-role only)
DROP POLICY IF EXISTS "Outbox readable only by admin" ON outbox_jobs;
CREATE POLICY "Outbox readable only by admin" ON outbox_jobs
  FOR SELECT USING (has_role('admin'));

-- AI episodes policies
DROP POLICY IF EXISTS "AI episodes readable only by episode investor or admin" ON ai_episodes;
CREATE POLICY "AI episodes readable only by episode investor or admin" ON ai_episodes
  FOR SELECT USING (auth.uid() = investor_id OR has_role('admin'));

-- Audit logs policies (Read only for admin)
DROP POLICY IF EXISTS "Audit logs readable only by admin" ON audit_logs;
CREATE POLICY "Audit logs readable only by admin" ON audit_logs
  FOR SELECT USING (has_role('admin'));
`;

fs.writeFileSync('supabase/migrations/20261106000000_m2_initial_schema.sql', sql);
console.log('Successfully generated supabase/migrations/20261106000000_m2_initial_schema.sql');
