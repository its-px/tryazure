-- Add tenant_id column to services table if it doesn't exist
ALTER TABLE services
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;

-- Create index for tenant_id lookups
CREATE INDEX IF NOT EXISTS idx_services_tenant_id ON services(tenant_id);

-- Make services unique per tenant + name (allow same service name in different tenants)
-- Only drop old constraint if it exists
ALTER TABLE services
DROP CONSTRAINT IF EXISTS services_name_key;

-- Only add new constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'services' AND constraint_name = 'services_tenant_name_unique'
  ) THEN
    ALTER TABLE services
    ADD CONSTRAINT services_tenant_name_unique UNIQUE (tenant_id, name);
  END IF;
END $$;

-- Comment for clarity
COMMENT ON COLUMN services.tenant_id IS 'Tenant that owns this service. NULL = shared across all tenants.';
