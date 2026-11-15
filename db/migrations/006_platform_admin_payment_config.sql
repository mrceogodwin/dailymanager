-- Platform-level administration and encrypted payment-provider configuration.
-- Apply only after a production backup is available and the live schema is rechecked.
CREATE TABLE IF NOT EXISTS platform_payment_configs (
  provider TEXT NOT NULL CHECK (provider IN ('paystack','bachs')),
  mode TEXT NOT NULL CHECK (mode IN ('test','live')),
  encrypted_payload TEXT NOT NULL,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, mode)
);
