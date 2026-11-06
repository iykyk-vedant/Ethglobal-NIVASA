-- Migration: 20261106000001_m5_payment_trigger.sql
-- ARCH §14.1, PRD FR-5.3: Enqueue allocate_units job when order transitions to PAYMENT_CONFIRMED

CREATE OR REPLACE FUNCTION on_order_payment_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'PAYMENT_CONFIRMED' AND (OLD.status IS NULL OR OLD.status <> 'PAYMENT_CONFIRMED') THEN
    INSERT INTO outbox_jobs (type, dedupe_key, payload, status)
    VALUES (
      'allocate_units',
      NEW.id::text,
      jsonb_build_object(
        'orderId', NEW.id,
        'investorId', NEW.investor_id,
        'offeringId', NEW.offering_id,
        'units', NEW.units
      ),
      'pending'
    )
    ON CONFLICT (type, dedupe_key) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_payment_confirmed ON investment_orders;
CREATE TRIGGER trg_order_payment_confirmed
  AFTER UPDATE OF status ON investment_orders
  FOR EACH ROW
  EXECUTE FUNCTION on_order_payment_confirmed();

-- Fail-closed terminal transitions to MANUAL_REVIEW (ARCH §14.1)
INSERT INTO allowed_transitions (entity_type, from_status, to_status)
VALUES
  ('order', 'PAYMENT_CONFIRMED', 'MANUAL_REVIEW'),
  ('order', 'ALLOCATION_PENDING', 'MANUAL_REVIEW')
ON CONFLICT (entity_type, from_status, to_status) DO NOTHING;
