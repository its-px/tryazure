-- 1. Owner-editable business settings.
-- tenants only has an admin UPDATE policy, so owner writes (incl. the existing
-- "location step" toggle) were silently no-ops. Instead of opening UPDATE on the
-- whole row (slug/domain must stay admin-only), owners go through this RPC, which
-- can only touch their own tenant's name + config.
CREATE OR REPLACE FUNCTION update_my_tenant(p_name text, p_config jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  k text;
BEGIN
  IF coalesce(get_my_role(), '') <> 'owner' OR get_my_tenant_id() IS NULL THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- tenants.config is public (tenants_public_read) and colors are injected into CSS,
  -- so only accept plain hex colors and https URLs for those keys.
  FOREACH k IN ARRAY ARRAY['primaryColor','primaryLight','primaryDark','primaryHover','primaryOverlay'] LOOP
    IF p_config ? k AND NOT (p_config->>k ~ '^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$') THEN
      RAISE EXCEPTION 'invalid color for %', k USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOREACH k IN ARRAY ARRAY['logoUrl','googleReviewUrl','website'] LOOP
    IF p_config ? k AND coalesce(p_config->>k, '') <> '' AND NOT (p_config->>k ~ '^https://') THEN
      RAISE EXCEPTION 'invalid url for %', k USING ERRCODE = '22023';
    END IF;
  END LOOP;

  UPDATE tenants
  SET name = coalesce(nullif(trim(p_name), ''), name),
      config = coalesce(config, '{}'::jsonb) || coalesce(p_config, '{}'::jsonb)
  WHERE id = get_my_tenant_id();
END;
$$;

REVOKE ALL ON FUNCTION update_my_tenant(text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION update_my_tenant(text, jsonb) TO authenticated;

-- 2. Stripe Connect: each tenant's own Stripe account for client payments.
ALTER TABLE tenant_billing
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS connect_charges_enabled boolean NOT NULL DEFAULT false;

-- Booking wizard (anon or logged-in client) needs to know whether to offer "card".
-- tenant_billing is owner-only, so expose just this boolean.
CREATE OR REPLACE FUNCTION tenant_accepts_card(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT connect_charges_enabled FROM tenant_billing WHERE tenant_id = p_tenant_id),
    false
  );
$$;
GRANT EXECUTE ON FUNCTION tenant_accepts_card(uuid) TO anon, authenticated;

-- 3. Booking payment fields.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'card')),
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

-- Clients can INSERT/UPDATE their own bookings (bookings_insert_own / _update_own),
-- which would let them mark a booking paid. Only the service role (stripe-webhook)
-- or the tenant's owner (marking cash as paid) may change payment state.
CREATE OR REPLACE FUNCTION protect_booking_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF get_my_role() = 'owner' AND NEW.tenant_id = get_my_tenant_id() THEN
    NEW.stripe_checkout_session_id := CASE WHEN TG_OP = 'UPDATE' THEN OLD.stripe_checkout_session_id END;
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.payment_status := 'unpaid';
    NEW.stripe_checkout_session_id := NULL;
  ELSE
    NEW.payment_method := OLD.payment_method;
    NEW.payment_status := OLD.payment_status;
    NEW.stripe_checkout_session_id := OLD.stripe_checkout_session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bookings_protect_payment ON bookings;
CREATE TRIGGER bookings_protect_payment
BEFORE INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE FUNCTION protect_booking_payment();
