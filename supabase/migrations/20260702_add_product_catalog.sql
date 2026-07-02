-- Retail product catalog (item 6 of the growth roadmap): tenants sell
-- take-home products (e.g. a bottle of product a hairdresser sells) that
-- customers can add to a booking, distinct from bookable `services`.
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  -- Typical days until a customer needs to rebuy. Null = no replenishment SMS.
  replenish_days integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Same pattern as `services`: public can browse active products (booking
-- wizard add-ons step), only the owning tenant's owner/admin can manage.
CREATE POLICY products_select_public ON products
FOR SELECT
USING (true);

CREATE POLICY products_manage_owner ON products
FOR ALL
USING (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id())
WITH CHECK (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id());

CREATE POLICY products_manage_admin ON products
FOR ALL
USING (get_my_role() = 'admin')
WITH CHECK (get_my_role() = 'admin');

-- What was added to a booking, keeping the price at time of purchase.
CREATE TABLE IF NOT EXISTS booking_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  tenant_id uuid,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  -- Tracks whether the replenishment cron already nudged this purchase, so
  -- it can't double-send.
  replenishment_sent_at timestamptz
);

ALTER TABLE booking_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON booking_products
FOR ALL
USING (tenant_id = get_my_tenant_id())
WITH CHECK (tenant_id = get_my_tenant_id());
