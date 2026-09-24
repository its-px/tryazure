-- Staff logins: an owner invites a professional (edge function invite-staff), which
-- links the new auth user to the professionals row and sets profiles.role='professional'.
--
-- ProfessionalPanel identifies "which professional am I" from
-- user_metadata.professional_code, but user_metadata is editable by the user
-- (auth.updateUser), so RLS must not trust it. Access is keyed on
-- professionals.user_id instead, which only the service role / owner can set.

ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION get_my_professional_code()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.code FROM professionals p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.user_id = auth.uid()
    AND pr.role = 'professional'
    AND p.tenant_id = pr.tenant_id
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION get_my_professional_code() FROM public, anon;
GRANT EXECUTE ON FUNCTION get_my_professional_code() TO authenticated;

-- bookings had no professional policies, so ProfessionalPanel saw nothing.
-- Payment fields stay protected by the protect_booking_payment trigger.
DROP POLICY IF EXISTS bookings_select_professional ON bookings;
CREATE POLICY bookings_select_professional ON bookings FOR SELECT
  USING (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code());
DROP POLICY IF EXISTS bookings_update_professional ON bookings;
CREATE POLICY bookings_update_professional ON bookings FOR UPDATE
  USING (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code())
  WITH CHECK (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code());
DROP POLICY IF EXISTS bookings_delete_professional ON bookings;
CREATE POLICY bookings_delete_professional ON bookings FOR DELETE
  USING (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code());

-- Professionals edit their own working hours in ProfessionalPanel. Today that only
-- works through the broad tenant_isolation policy; make it explicit so tightening
-- tenant_isolation later doesn't break it.
DROP POLICY IF EXISTS professional_hours_manage_own ON professional_hours;
CREATE POLICY professional_hours_manage_own ON professional_hours FOR ALL
  USING (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code())
  WITH CHECK (tenant_id = get_my_tenant_id() AND professional_id = get_my_professional_code());
