-- Remove legacy global uniqueness and enforce tenant-scoped uniqueness.

-- Safety: deduplicate by tenant/professional/day before adding scoped uniqueness.
DELETE FROM public.professional_hours a
USING public.professional_hours b
WHERE a.ctid < b.ctid
  AND a.tenant_id = b.tenant_id
  AND a.professional_id = b.professional_id
  AND a.day_of_week = b.day_of_week;

-- Drop old global unique constraint/index if still present.
ALTER TABLE public.professional_hours
DROP CONSTRAINT IF EXISTS professional_hours_professional_id_day_of_week_key;

DROP INDEX IF EXISTS public.professional_hours_professional_id_day_of_week_key;

-- Add tenant-scoped uniqueness if missing.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'professional_hours'
      AND constraint_name = 'professional_hours_unique_per_tenant'
  ) THEN
    ALTER TABLE public.professional_hours
    ADD CONSTRAINT professional_hours_unique_per_tenant
    UNIQUE (tenant_id, professional_id, day_of_week);
  END IF;
END $$;
