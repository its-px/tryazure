-- Ensure professionals are tenant-specific and can be referenced by string code
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS code text;

UPDATE professionals
SET code = id::text
WHERE code IS NULL;

ALTER TABLE professionals
ALTER COLUMN code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_tenant_code_unique
  ON professionals (tenant_id, code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_tenant_name_unique
  ON professionals (tenant_id, name);

-- Seed default professionals per tenant if missing (compatible with existing prof1/prof2 data)
INSERT INTO professionals (id, name, tenant_id, code)
SELECT gen_random_uuid(), 'Person 1', t.id, 'prof1'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM professionals p
  WHERE p.tenant_id = t.id
    AND p.code = 'prof1'
);

INSERT INTO professionals (id, name, tenant_id, code)
SELECT gen_random_uuid(), 'Person 2', t.id, 'prof2'
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1
  FROM professionals p
  WHERE p.tenant_id = t.id
    AND p.code = 'prof2'
);

-- Recreate tenant-aware available slots RPC
DROP FUNCTION IF EXISTS get_available_slots(TEXT, DATE, INTEGER, UUID);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id TEXT,
  p_date DATE,
  p_service_duration_minutes INTEGER,
  p_tenant_id UUID
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME
) AS $$
DECLARE
  v_day_of_week INTEGER;
  v_work_start TIME;
  v_work_end TIME;
  v_current_time TIME;
  v_slot_duration INTERVAL;
  v_slot_end_time TIME;
BEGIN
  v_day_of_week := EXTRACT(DOW FROM p_date);

  SELECT ph.start_time, ph.end_time
  INTO v_work_start, v_work_end
  FROM professional_hours ph
  WHERE ph.professional_id = p_professional_id
    AND ph.day_of_week = v_day_of_week
    AND (p_tenant_id IS NULL OR ph.tenant_id = p_tenant_id);

  IF v_work_start IS NULL THEN
    RETURN;
  END IF;

  v_slot_duration := (p_service_duration_minutes || ' minutes')::INTERVAL;
  v_current_time := v_work_start;

  WHILE v_current_time + v_slot_duration <= v_work_end LOOP
    v_slot_end_time := v_current_time + v_slot_duration;

    IF NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.professional_id = p_professional_id
        AND b.date = p_date
        AND b.status IN ('confirmed', 'pending')
        AND (p_tenant_id IS NULL OR b.tenant_id = p_tenant_id)
        AND b.start_time < v_slot_end_time
        AND b.end_time > v_current_time
    ) THEN
      start_time := v_current_time;
      end_time := v_slot_end_time;
      RETURN NEXT;
    END IF;

    v_current_time := v_current_time + INTERVAL '30 minutes';
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER, UUID) TO anon;

-- Backward-compatible wrapper for legacy callers (no tenant filter)
DROP FUNCTION IF EXISTS get_available_slots(TEXT, DATE, INTEGER);

CREATE OR REPLACE FUNCTION get_available_slots(
  p_professional_id TEXT,
  p_date DATE,
  p_service_duration_minutes INTEGER
)
RETURNS TABLE (
  start_time TIME,
  end_time TIME
) AS $$
  SELECT *
  FROM get_available_slots(
    p_professional_id,
    p_date,
    p_service_duration_minutes,
    NULL::UUID
  );
$$ LANGUAGE sql STABLE;

GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO anon;
