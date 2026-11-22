-- Persist the end of the paid billing period so cancellations and failed
-- renewals do not revoke workspace access before the customer has received
-- the period they already paid for.
-- Additive and safe to rerun; apply only after reviewing the target Neon schema.

ALTER TABLE billing_customers
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS billing_customers_period_expiry_idx
  ON billing_customers (status, current_period_end)
  WHERE current_period_end IS NOT NULL;
