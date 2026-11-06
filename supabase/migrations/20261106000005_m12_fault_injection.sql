-- Migration: 20261106000005_m12_fault_injection.sql
-- Milestone M12: D4 Settlement Under Failure & Fault Injector
-- ARCH §14.2, §14.7, §22.2 (D4) · PRD FR-5.10 · UI §8.11, §10.6 · PLAN M12

CREATE TABLE IF NOT EXISTS demo_fault_injections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fault_type TEXT NOT NULL CHECK (fault_type IN ('timeout_after_submit', 'fail_before_submit', 'duplicate_job')),
  order_id UUID REFERENCES investment_orders(id) ON DELETE CASCADE,
  armed_by UUID REFERENCES profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'armed' CHECK (status IN ('armed', 'consumed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup of armed faults
CREATE INDEX IF NOT EXISTS idx_demo_faults_lookup 
  ON demo_fault_injections(status, order_id, created_at DESC);

-- Enable RLS
ALTER TABLE demo_fault_injections ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_demo_faults_all" ON demo_fault_injections
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated admins can view demo faults
CREATE POLICY "admin_view_demo_faults" ON demo_fault_injections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
    )
  );

