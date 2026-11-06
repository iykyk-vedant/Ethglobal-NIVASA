-- Migration: 20261106000004_m10_evidence_drift.sql
-- Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume
-- ARCH §12, §9.3, §17.1, §17.4 · PRD FR-4.x · PLAN M10

-- 1. Update evidence_manifests.status constraint to include 'superseded-pending'
ALTER TABLE evidence_manifests DROP CONSTRAINT IF EXISTS evidence_manifests_status_check;
ALTER TABLE evidence_manifests ADD CONSTRAINT evidence_manifests_status_check
  CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'superseded', 'superseded-pending'));

-- 2. Add allowed transitions for manifest state machine
INSERT INTO allowed_transitions (entity_type, from_status, to_status) VALUES
  ('manifest', 'approved', 'superseded-pending'),
  ('manifest', 'superseded-pending', 'superseded'),
  ('manifest', 'superseded-pending', 'approved')
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;

-- 3. Update enforce_manifest_immutability trigger function
CREATE OR REPLACE FUNCTION enforce_manifest_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.status = 'approved' THEN
    IF NEW.status NOT IN ('approved', 'superseded-pending', 'superseded') THEN
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

-- 4. Add drift tracking columns to offerings table
ALTER TABLE offerings
  ADD COLUMN IF NOT EXISTS drift_trigger text,
  ADD COLUMN IF NOT EXISTS drift_manifest_id uuid REFERENCES evidence_manifests(id),
  ADD COLUMN IF NOT EXISTS drift_uploader_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS paused_evidence_drift_at timestamptz;

-- 5. Add index on evidence_manifests status for quick lookup
CREATE INDEX IF NOT EXISTS idx_evidence_manifests_status ON evidence_manifests(property_id, status);

