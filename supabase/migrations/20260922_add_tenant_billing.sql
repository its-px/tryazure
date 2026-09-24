-- Tenant → platform billing (Stripe subscriptions).
-- Kept in its own table, not on tenants: owners can UPDATE their tenants row (config
-- toggles from OwnerPanel), so billing columns there would let an owner mark themselves
-- paid. Here owners get SELECT only; writes come from the stripe-webhook / billing
-- edge functions via the service role.

CREATE TABLE IF NOT EXISTS tenant_billing (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan text,                                   -- 'basic' | 'pro', null while on trial
  status text NOT NULL DEFAULT 'trialing',     -- mirrors Stripe subscription.status
  trial_ends_at timestamptz DEFAULT now() + interval '30 days',
  current_period_end timestamptz,
  past_due_since timestamptz,                  -- start of the 7-day grace window
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tenant_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_billing_owner_select ON tenant_billing;
CREATE POLICY tenant_billing_owner_select ON tenant_billing
FOR SELECT
USING (tenant_id = get_my_tenant_id());

-- Every tenant starts a 30-day trial, no card needed.
CREATE OR REPLACE FUNCTION create_tenant_billing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO tenant_billing (tenant_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tenants_create_billing ON tenants;
CREATE TRIGGER tenants_create_billing
AFTER INSERT ON tenants
FOR EACH ROW EXECUTE FUNCTION create_tenant_billing();

-- Backfill: existing tenants get a fresh 30-day trial so nobody is locked out on deploy.
INSERT INTO tenant_billing (tenant_id)
SELECT id FROM tenants
ON CONFLICT DO NOTHING;
