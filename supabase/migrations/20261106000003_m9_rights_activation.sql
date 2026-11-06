-- Milestone M9: Rights and D1 activation gate schema additions

-- Offerings table: activation checks, policy version, and approval timestamp
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS activation_checks jsonb;
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS eligibility_policy_version text DEFAULT 'v1.0';
ALTER TABLE offerings ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;

-- Offering Rights table: rights details
ALTER TABLE offering_rights ADD COLUMN IF NOT EXISTS represents text;
ALTER TABLE offering_rights ADD COLUMN IF NOT EXISTS does_not_represent text;
ALTER TABLE offering_rights ADD COLUMN IF NOT EXISTS simulated_status text;
ALTER TABLE offering_rights ADD COLUMN IF NOT EXISTS terms_json jsonb;

-- Allowed transitions for offering lifecycle and rights revision workflows
INSERT INTO allowed_transitions (entity_type, from_status, to_status) VALUES
  ('offering', 'draft', 'proposed'),
  ('offering', 'proposed', 'legal_review_pending'),
  ('offering', 'legal_review_pending', 'approved_for_demo'),
  ('offering', 'approved_for_demo', 'token_configured'),
  ('offering', 'token_configured', 'active'),
  ('offering', 'token_configured', 'legal_review_pending'),
  ('offering', 'active', 'legal_review_pending'),
  ('offering', 'active', 'paused'),
  ('offering', 'active', 'paused_evidence_drift'),
  ('offering', 'active', 'closed'),
  ('offering', 'paused', 'active'),
  ('offering', 'paused', 'closed')
ON CONFLICT DO NOTHING;
