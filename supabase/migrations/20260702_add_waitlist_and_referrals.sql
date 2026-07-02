-- Waitlist: customers can ask to be notified when a slot frees up for a
-- service/professional/date that has nothing available right now.
CREATE TABLE IF NOT EXISTS waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  service_id uuid NOT NULL REFERENCES services(id),
  professional_id uuid REFERENCES professionals(id), -- NULL = any professional
  preferred_date date, -- NULL = any date
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'booked', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS waitlist_entries_tenant_status_idx
  ON waitlist_entries(tenant_id, status);

ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Owner/professional side: same tenant-scoping convention as every other table.
DROP POLICY IF EXISTS tenant_isolation ON waitlist_entries;
CREATE POLICY tenant_isolation ON waitlist_entries
FOR ALL
USING (tenant_id = get_my_tenant_id());

-- Customer side: a user can see/insert/cancel their own entries even if
-- get_my_tenant_id() doesn't resolve for them (mirrors bookings' reliance on
-- the tenant policy above being OR'd with direct ownership isn't present on
-- bookings today, but waitlist is customer-self-service so add it explicitly).
DROP POLICY IF EXISTS own_entries ON waitlist_entries;
CREATE POLICY own_entries ON waitlist_entries
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Referral program: short shareable code per profile + who referred whom.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES profiles(id);

-- Backfill existing rows created before the default existed.
UPDATE profiles SET referral_code = substr(md5(random()::text), 1, 8)
WHERE referral_code IS NULL;
