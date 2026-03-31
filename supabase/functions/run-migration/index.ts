import postgres from "https://deno.land/x/postgresjs@v3.4.4/mod.js";

// Edge functions have internal access to the DB via SUPABASE_DB_URL
Deno.serve(async (req) => {
  // Security: require a secret header
  const authHeader = req.headers.get("x-migration-secret");
  if (authHeader !== "run-multitenancy-migration-2026") {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return new Response(JSON.stringify({ error: "SUPABASE_DB_URL not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
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
      name: "Set NOT NULL on availability.tenant_id",
      query: `ALTER TABLE availability ALTER COLUMN tenant_id SET NOT NULL`,
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
