import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

// Edge functions have internal access to the DB via SUPABASE_DB_URL
Deno.serve(async (req: Request) => {
  // Security: require a secret header
  const authHeader = req.headers.get("x-migration-secret");
  if (authHeader !== "run-multitenancy-migration-2026") {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_DB_URL not available" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const sql = postgres(dbUrl, { ssl: "require" });

  const steps: { step: string; status: string; error?: string }[] = [];

  const statements = [
    {
      name: "Backfill NULL tenant_id in professional_hours",
      query: `UPDATE professional_hours SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL`,
    },
    {
      name: "Backfill NULL tenant_id in availability",
      query: `UPDATE availability SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL`,
    },
    {
      name: "Set NOT NULL on professional_hours.tenant_id",
      query: `ALTER TABLE professional_hours ALTER COLUMN tenant_id SET NOT NULL`,
    },
    {
      name: "Deduplicate professional_hours by tenant/professional/day",
      query: `DELETE FROM professional_hours a USING professional_hours b WHERE a.ctid < b.ctid AND a.tenant_id = b.tenant_id AND a.professional_id = b.professional_id AND a.day_of_week = b.day_of_week`,
    },
    {
      name: "Drop legacy global uniqueness on professional_hours",
      query: `ALTER TABLE professional_hours DROP CONSTRAINT IF EXISTS professional_hours_professional_id_day_of_week_key; DROP INDEX IF EXISTS professional_hours_professional_id_day_of_week_key`,
    },
    {
      name: "Create tenant-scoped uniqueness on professional_hours",
      query: `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_schema = 'public' AND table_name = 'professional_hours' AND constraint_name = 'professional_hours_unique_per_tenant') THEN ALTER TABLE professional_hours ADD CONSTRAINT professional_hours_unique_per_tenant UNIQUE (tenant_id, professional_id, day_of_week); END IF; END $$`,
    },
    {
      name: "Set NOT NULL on availability.tenant_id",
      query: `ALTER TABLE availability ALTER COLUMN tenant_id SET NOT NULL`,
    },
    {
      name: "Deduplicate availability by tenant/date",
      query: `DELETE FROM availability a USING availability b WHERE a.ctid < b.ctid AND a.tenant_id = b.tenant_id AND a.date = b.date`,
    },
    {
      name: "Drop legacy global date uniqueness on availability",
      query: `ALTER TABLE availability DROP CONSTRAINT IF EXISTS unique_date; ALTER TABLE availability DROP CONSTRAINT IF EXISTS availability_date_key; DROP INDEX IF EXISTS unique_date; DROP INDEX IF EXISTS availability_date_key`,
    },
    {
      name: "Create tenant-scoped uniqueness on availability",
      query: `ALTER TABLE availability ADD CONSTRAINT unique_date_per_tenant UNIQUE (tenant_id, date)`,
    },
    {
      name: "Add professionals.code column",
      query: `ALTER TABLE professionals ADD COLUMN IF NOT EXISTS code text`,
    },
    {
      name: "Backfill professionals.code",
      query: `UPDATE professionals SET code = id::text WHERE code IS NULL`,
    },
    {
      name: "Set NOT NULL on professionals.code",
      query: `ALTER TABLE professionals ALTER COLUMN code SET NOT NULL`,
    },
    {
      name: "Create unique professionals indexes",
      query: `CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_tenant_code_unique ON professionals (tenant_id, code); CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_tenant_name_unique ON professionals (tenant_id, name)`,
    },
    {
      name: "Seed default professionals per tenant",
      query: `INSERT INTO professionals (id, name, tenant_id, code) SELECT gen_random_uuid(), 'Person 1', t.id, 'prof1' FROM tenants t WHERE NOT EXISTS (SELECT 1 FROM professionals p WHERE p.tenant_id = t.id AND p.code = 'prof1'); INSERT INTO professionals (id, name, tenant_id, code) SELECT gen_random_uuid(), 'Person 2', t.id, 'prof2' FROM tenants t WHERE NOT EXISTS (SELECT 1 FROM professionals p WHERE p.tenant_id = t.id AND p.code = 'prof2')`,
    },
    {
      name: "Recreate tenant-aware get_available_slots",
      query: `DROP FUNCTION IF EXISTS get_available_slots(TEXT, DATE, INTEGER, UUID); CREATE OR REPLACE FUNCTION get_available_slots(p_professional_id TEXT, p_date DATE, p_service_duration_minutes INTEGER, p_tenant_id UUID) RETURNS TABLE (start_time TIME, end_time TIME) AS $$ DECLARE v_day_of_week INTEGER; v_work_start TIME; v_work_end TIME; v_current_time TIME; v_slot_duration INTERVAL; v_slot_end_time TIME; BEGIN v_day_of_week := EXTRACT(DOW FROM p_date); SELECT ph.start_time, ph.end_time INTO v_work_start, v_work_end FROM professional_hours ph WHERE ph.professional_id = p_professional_id AND ph.day_of_week = v_day_of_week AND (p_tenant_id IS NULL OR ph.tenant_id = p_tenant_id); IF v_work_start IS NULL THEN RETURN; END IF; v_slot_duration := (p_service_duration_minutes || ' minutes')::INTERVAL; v_current_time := v_work_start; WHILE v_current_time + v_slot_duration <= v_work_end LOOP v_slot_end_time := v_current_time + v_slot_duration; IF NOT EXISTS (SELECT 1 FROM bookings b WHERE b.professional_id = p_professional_id AND b.date = p_date AND b.status IN ('confirmed', 'pending') AND (p_tenant_id IS NULL OR b.tenant_id = p_tenant_id) AND b.start_time < v_slot_end_time AND b.end_time > v_current_time) THEN start_time := v_current_time; end_time := v_slot_end_time; RETURN NEXT; END IF; v_current_time := v_current_time + INTERVAL '30 minutes'; END LOOP; RETURN; END; $$ LANGUAGE plpgsql STABLE; GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER, UUID) TO authenticated; GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER, UUID) TO anon; DROP FUNCTION IF EXISTS get_available_slots(TEXT, DATE, INTEGER); CREATE OR REPLACE FUNCTION get_available_slots(p_professional_id TEXT, p_date DATE, p_service_duration_minutes INTEGER) RETURNS TABLE (start_time TIME, end_time TIME) AS $$ SELECT * FROM get_available_slots(p_professional_id, p_date, p_service_duration_minutes, NULL::UUID); $$ LANGUAGE sql STABLE; GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO authenticated; GRANT EXECUTE ON FUNCTION get_available_slots(TEXT, DATE, INTEGER) TO anon`,
    },
    {
      name: "Enable RLS on professional_hours",
      query: `ALTER TABLE professional_hours ENABLE ROW LEVEL SECURITY`,
    },
    {
      name: "Enable RLS on availability",
      query: `ALTER TABLE availability ENABLE ROW LEVEL SECURITY`,
    },
    {
      name: "Drop old policy on professional_hours",
      query: `DROP POLICY IF EXISTS "tenant_isolation_professional_hours" ON professional_hours`,
    },
    {
      name: "Drop old policy on availability",
      query: `DROP POLICY IF EXISTS "tenant_isolation_availability" ON availability`,
    },
    {
      name: "Create RLS policy on professional_hours",
      query: `CREATE POLICY "tenant_isolation_professional_hours" ON professional_hours FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`,
    },
    {
      name: "Create RLS policy on availability",
      query: `CREATE POLICY "tenant_isolation_availability" ON availability FOR ALL USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true))`,
    },
    {
      name: "Seed tennis tenant",
      query: `DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM tenants
    WHERE slug = 'tennis'
       OR domain = 'tennis.pxbs.site'
  ) THEN
    INSERT INTO tenants (id, slug, domain, name, config, created_at)
    VALUES (
      '00000000-0000-0000-0000-000000000003',
      'tennis',
      'tennis.pxbs.site',
      'Tennis',
      jsonb_build_object(
        'logoUrl', 'https://qrvxmqksekxbtipdnfru.supabase.co/storage/v1/object/public/tenant-assets/tennislogo.png',
        'senderName', 'Tennis',
        'primaryColor', '#CCFF00',
        'primaryLight', '#FFFF99',
        'primaryDark', '#99CC00',
        'primaryHover', '#E6FF33',
        'primaryOverlay', 'rgba(204, 255, 0, 0.12)'
      ),
      now()
    );
  END IF;
END $$;

INSERT INTO professionals (id, name, tenant_id, code)
SELECT gen_random_uuid(), v.name, v.tenant_id, v.code
FROM (
  VALUES
    ('Person 1', '00000000-0000-0000-0000-000000000003'::uuid, 'prof1'),
    ('Person 2', '00000000-0000-0000-0000-000000000003'::uuid, 'prof2')
) AS v(name, tenant_id, code)
WHERE NOT EXISTS (
  SELECT 1
  FROM professionals p
  WHERE p.tenant_id = v.tenant_id
    AND p.code = v.code
);

INSERT INTO professional_hours (professional_id, day_of_week, start_time, end_time, tenant_id)
SELECT v.professional_id, v.day_of_week, v.start_time, v.end_time, v.tenant_id
FROM (
  VALUES
    ('prof1', 1, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof1', 2, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof1', 3, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof1', 4, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof1', 5, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof2', 1, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof2', 2, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof2', 3, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof2', 4, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid),
    ('prof2', 5, '09:00:00'::time, '17:00:00'::time, '00000000-0000-0000-0000-000000000003'::uuid)
) AS v(professional_id, day_of_week, start_time, end_time, tenant_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM professional_hours ph
  WHERE ph.tenant_id = v.tenant_id
    AND ph.professional_id = v.professional_id
    AND ph.day_of_week = v.day_of_week
);

INSERT INTO availability (id, date, tenant_id, start_time, end_time, created_at, is_active)
SELECT
  gen_random_uuid(),
  d::date,
  '00000000-0000-0000-0000-000000000003'::uuid,
  NULL,
  NULL,
  now(),
  NULL
FROM generate_series(GREATEST(CURRENT_DATE, DATE '2026-05-07'), DATE '2026-12-31', INTERVAL '1 day') AS d
WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
  AND NOT EXISTS (
    SELECT 1
    FROM availability a
    WHERE a.tenant_id = '00000000-0000-0000-0000-000000000003'::uuid
      AND a.date = d::date
  );

INSERT INTO services (id, name, duration_minutes, price, tenant_id)
SELECT gen_random_uuid(), v.name, v.duration_minutes, v.price, v.tenant_id
FROM (
  VALUES
    ('Court Booking', 60, 40, '00000000-0000-0000-0000-000000000003'::uuid),
    ('Private Lesson', 60, 60, '00000000-0000-0000-0000-000000000003'::uuid),
    ('Group Lesson', 90, 30, '00000000-0000-0000-0000-000000000003'::uuid)
) AS v(name, duration_minutes, price, tenant_id)
WHERE NOT EXISTS (
  SELECT 1
  FROM services s
  WHERE s.tenant_id = v.tenant_id
    AND s.name = v.name
  )`,
    },
  ];

  for (const { name, query } of statements) {
    try {
      await sql.unsafe(query);
      steps.push({ step: name, status: "✅ ok" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Treat "already exists" / "already enabled" as OK
      if (msg.includes("already exists") || msg.includes("already enabled")) {
        steps.push({ step: name, status: "✅ already done" });
      } else {
        steps.push({ step: name, status: "❌ error", error: msg });
      }
    }
  }

  await sql.end();

  return new Response(JSON.stringify({ steps }, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
