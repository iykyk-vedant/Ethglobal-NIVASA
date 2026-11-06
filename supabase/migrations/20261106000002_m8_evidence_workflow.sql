-- Milestone M8: Evidence workflow additions
ALTER TABLE property_documents ADD COLUMN IF NOT EXISTS limitation_note text;

-- Index on property_documents by property_id and status
CREATE INDEX IF NOT EXISTS idx_property_documents_prop_status ON property_documents(property_id, status);

-- Index on evidence_manifests by property_id and version
CREATE INDEX IF NOT EXISTS idx_evidence_manifests_prop_version ON evidence_manifests(property_id, version);

-- Allow direct verification decision transitions from submitted
INSERT INTO allowed_transitions (entity_type, from_status, to_status) VALUES
  ('property', 'submitted', 'verified'),
  ('property', 'submitted', 'rejected'),
  ('property', 'submitted', 'needs_more_information')
ON CONFLICT DO NOTHING;
