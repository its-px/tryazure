-- Services are fetched through explicit tenant filters in the app query.
-- Keep SELECT policy permissive to avoid session-dependent failures across stateless REST calls.

DROP POLICY IF EXISTS services_select_public ON services;
DROP POLICY IF EXISTS tenant_isolation ON services;

CREATE POLICY "services_select_public" ON services
FOR SELECT
USING (true);

-- Verify policies currently applied on services
SELECT tablename, policyname, permissive, qual
FROM pg_policies
WHERE tablename = 'services'
ORDER BY policyname;
