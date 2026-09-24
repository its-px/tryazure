-- Tighten multi-tenant RLS.
--
-- 1. The generic `tenant_isolation` policy (FOR ALL USING tenant_id = get_my_tenant_id())
--    let ANY profile with a tenant_id, including ordinary clients, insert/update/delete
--    staff, hours, SMS templates, logs, etc. of their business via the REST API.
--    Replace it with explicit per-role policies.
-- 2. Several "admin_owner" policies had no tenant filter, so an owner could read/write
--    other businesses' SMS logs, templates, availability and reminders.
--
-- Client flows kept working (checked in my-app/src):
--   - customers insert booking_products for their own booking (UserPanel)
--   - customers manage their own waitlist_entries (own_entries policy, unchanged)
--   - booking_status_history is written by the SECURITY DEFINER trigger
--     log_booking_status_change, so it needs no client write policy
--   - owners manage staff/hours via existing *_manage_owner policies
--   - professionals manage their own hours via professional_hours_manage_own
--     (20260924_staff_logins.sql — apply that one first)
-- Edge functions use the service role and bypass RLS.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['availability','booking_products','booking_reminders',
    'booking_status_history','professional_hours','professionals','sms_logs',
    'sms_templates','waitlist_entries'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
  END LOOP;
END $$;

-- Owner/admin policies: admins everywhere, owners only inside their tenant.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['availability','booking_reminders','sms_logs','sms_templates'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_manage_admin_owner', t);
    EXECUTE format($p$CREATE POLICY %I ON %I FOR ALL
      USING (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()))
      WITH CHECK (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()))$p$,
      t || '_manage_admin_owner', t);
  END LOOP;
END $$;

-- booking_products: customers add products to their own bookings; owners/admins manage;
-- professionals of the tenant can read.
DROP POLICY IF EXISTS booking_products_insert_own ON booking_products;
CREATE POLICY booking_products_insert_own ON booking_products FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.id = booking_id AND b.user_id = auth.uid() AND b.tenant_id = booking_products.tenant_id
  ));
DROP POLICY IF EXISTS booking_products_select_own ON booking_products;
CREATE POLICY booking_products_select_own ON booking_products FOR SELECT
  USING (EXISTS (SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.user_id = auth.uid()));
DROP POLICY IF EXISTS booking_products_manage_admin_owner ON booking_products;
CREATE POLICY booking_products_manage_admin_owner ON booking_products FOR ALL
  USING (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()))
  WITH CHECK (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()));
DROP POLICY IF EXISTS booking_products_select_professional ON booking_products;
CREATE POLICY booking_products_select_professional ON booking_products FOR SELECT
  USING (get_my_role() = 'professional' AND tenant_id = get_my_tenant_id());

-- booking_status_history: read-only for staff of the tenant (statistics).
DROP POLICY IF EXISTS booking_status_history_select_staff ON booking_status_history;
CREATE POLICY booking_status_history_select_staff ON booking_status_history FOR SELECT
  USING (get_my_role() = 'admin'
    OR (get_my_role() IN ('owner', 'professional') AND tenant_id = get_my_tenant_id()));

-- waitlist_entries: owners/admins manage their tenant's waitlist (customers keep own_entries).
DROP POLICY IF EXISTS waitlist_entries_manage_admin_owner ON waitlist_entries;
CREATE POLICY waitlist_entries_manage_admin_owner ON waitlist_entries FOR ALL
  USING (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()))
  WITH CHECK (get_my_role() = 'admin' OR (get_my_role() = 'owner' AND tenant_id = get_my_tenant_id()));

-- ProfessionalPanel shows the client's name/phone on the professional's own bookings;
-- profiles had no professional policy (mirrors profiles_select_owner, narrowed to
-- bookings assigned to this professional). Needs get_my_professional_code() from
-- 20260924_staff_logins.sql.
DROP POLICY IF EXISTS profiles_select_professional ON profiles;
CREATE POLICY profiles_select_professional ON profiles FOR SELECT
  USING (get_my_role() = 'professional' AND EXISTS (
    SELECT 1 FROM bookings b
    WHERE b.user_id = profiles.id
      AND b.tenant_id = get_my_tenant_id()
      AND b.professional_id = get_my_professional_code()
  ));
