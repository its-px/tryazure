-- Remove legacy global uniqueness on date and keep tenant-scoped uniqueness only.
ALTER TABLE availability DROP CONSTRAINT IF EXISTS unique_date;
ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_date_key;
DROP INDEX IF EXISTS public.unique_date;
DROP INDEX IF EXISTS public.availability_date_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'availability'
      AND constraint_name = 'availability_tenant_date_unique'
  ) THEN
    ALTER TABLE availability
      ADD CONSTRAINT availability_tenant_date_unique UNIQUE (tenant_id, date);
  END IF;
END $$;
