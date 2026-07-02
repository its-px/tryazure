// Supabase Edge Function: generate-demo-tenant
// Platform-admin-only tool (AdminPanel) to spin up / tear down a fully seeded
// fake tenant for sales demos and onboarding. Not customer-facing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { slugify, randomSuffix } from "./slug.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEMO_SERVICES = [
  { name: "Haircut", duration_minutes: 30, price: 25 },
  { name: "Color & Style", duration_minutes: 90, price: 85 },
  { name: "Beard Trim", duration_minutes: 15, price: 15 },
  { name: "Deep Conditioning", duration_minutes: 45, price: 40 },
];

const DEMO_PROFESSIONALS = [
  { name: "Alex Rivera", code: "prof1" },
  { name: "Jordan Lee", code: "prof2" },
];

const DEMO_PRODUCTS = [
  { name: "Shampoo (Retail)", price: 18, replenish_days: 45 },
  { name: "Styling Wax", price: 14, replenish_days: 60 },
];

// ponytail: one flat business-hours shape for every seeded professional —
// per-professional variation isn't needed for a demo, add if a demo script asks for it.
const WEEKDAY_HOURS = [1, 2, 3, 4, 5, 6].map((d) => ({
  day_of_week: d,
  start_time: "09:00:00",
  end_time: d === 6 ? "14:00:00" : "17:00:00",
}));

async function uniqueSlug(admin: ReturnType<typeof createClient>, base: string) {
  // ponytail: a handful of retries is enough collision handling for an on-demand
  // admin tool; a DB-side unique-slug generator would be overkill here.
  let slug = base;
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await admin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${randomSuffix()}`;
  }
  throw new Error("Could not find a unique slug after 5 attempts");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    // ponytail: platform-admin only, unlike sms-admin this has no owner-scoped path —
    // demo-tenant creation/deletion is a platform capability, not a per-tenant one.
    if (!profile || profile.role !== "admin") {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));

    if (body.action === "delete") {
      const tenantId = body.tenant_id;
      if (!tenantId) return json({ error: "tenant_id is required" }, 400);

      const { data: tenantRow } = await admin.from("tenants").select("slug").eq("id", tenantId).single();
      if (!tenantRow) return json({ error: "Tenant not found" }, 404);
      if (!tenantRow.slug?.startsWith("demo-")) {
        return json({ error: "Refusing to delete a non-demo tenant (slug must start with demo-)" }, 400);
      }

      // ponytail: tenant_id FKs are ON DELETE RESTRICT (no cascade) across most tables,
      // so children must be deleted explicitly, in dependency order. bookings cascade
      // to booking_products/booking_status_history/booking_reminders automatically.
      await admin.from("waitlist_entries").delete().eq("tenant_id", tenantId);
      await admin.from("bookings").delete().eq("tenant_id", tenantId);
      await admin.from("sms_logs").delete().eq("tenant_id", tenantId);
      await admin.from("sms_templates").delete().eq("tenant_id", tenantId);
      await admin.from("availability").delete().eq("tenant_id", tenantId);
      await admin.from("professional_hours").delete().eq("tenant_id", tenantId);
      await admin.from("professionals").delete().eq("tenant_id", tenantId);
      await admin.from("services").delete().eq("tenant_id", tenantId);
      await admin.from("products").delete().eq("tenant_id", tenantId);
      await admin.from("profiles").delete().eq("tenant_id", tenantId);

      const { error: tenantDeleteError } = await admin.from("tenants").delete().eq("id", tenantId);
      if (tenantDeleteError) throw tenantDeleteError;

      return json({ success: true, deleted_tenant_id: tenantId });
    }

    // Default action: create.
    const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
    const baseSlug = name ? `demo-${slugify(name)}` : `demo-${randomSuffix()}`;
    const slug = await uniqueSlug(admin, baseSlug);

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        slug,
        name: name ?? `Demo Salon ${slug.replace("demo-", "")}`,
        config: {
          primaryColor: "#7C5CFC",
          primaryLight: "#B7A3FF",
          primaryDark: "#5A3FD9",
          primaryHover: "#9478FF",
          primaryOverlay: "rgba(124, 92, 252, 0.12)",
          senderName: "Demo",
        },
      })
      .select()
      .single();
    if (tenantError) throw tenantError;

    const { data: services, error: servicesError } = await admin
      .from("services")
      .insert(DEMO_SERVICES.map((s) => ({ ...s, tenant_id: tenant.id })))
      .select();
    if (servicesError) throw servicesError;

    const { data: professionals, error: professionalsError } = await admin
      .from("professionals")
      .insert(
        DEMO_PROFESSIONALS.map((p) => ({
          id: crypto.randomUUID(),
          ...p,
          tenant_id: tenant.id,
        })),
      )
      .select();
    if (professionalsError) throw professionalsError;

    const hoursRows = professionals.flatMap((p) =>
      WEEKDAY_HOURS.map((h) => ({ ...h, professional_id: p.code, tenant_id: tenant.id })),
    );
    const { error: hoursError } = await admin.from("professional_hours").insert(hoursRows);
    if (hoursError) throw hoursError;

    const { data: products, error: productsError } = await admin
      .from("products")
      .insert(DEMO_PRODUCTS.map((p) => ({ ...p, tenant_id: tenant.id })))
      .select();
    if (productsError) throw productsError;

    // Spread bookings across past/future dates with varied statuses so owner
    // dashboard stats (BookingStatistics, ROI ticker, lapsed-clients, etc.) have
    // real data. No auth.users/profiles rows are created for these — bookings use
    // user_id = NULL with source = 'walk_in'/'admin', which the schema allows.
    const today = new Date();
    const dayOffsets = [-30, -21, -14, -10, -7, -5, -3, -1, 0, 2, 5, 9, 14, 21];
    const statuses = ["completed", "completed", "completed", "confirmed", "confirmed", "pending", "cancelled"];
    const bookingRows = dayOffsets.map((offset, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const dateStr = date.toISOString().slice(0, 10);
      const service = services[i % services.length];
      const professional = professionals[i % professionals.length];
      const status = offset < 0 ? statuses[i % statuses.length] : offset === 0 ? "confirmed" : "pending";
      const startHour = 9 + (i % 8);
      return {
        tenant_id: tenant.id,
        user_id: null,
        source: i % 3 === 0 ? "walk_in" : "admin",
        date: dateStr,
        booking_date: dateStr,
        start_time: `${String(startHour).padStart(2, "0")}:00:00`,
        end_time: `${String(startHour).padStart(2, "0")}:${String(service.duration_minutes % 60).padStart(2, "0")}:00`,
        service_id: service.id,
        professional_id: professional.code,
        status,
        services: [{ id: service.id, name: service.name, price: service.price }],
      };
    });
    const { data: bookings, error: bookingsError } = await admin.from("bookings").insert(bookingRows).select();
    if (bookingsError) throw bookingsError;

    // A couple of product add-ons attached to completed bookings.
    const completedBookings = bookings.filter((b) => b.status === "completed");
    if (completedBookings.length > 0) {
      const bookingProductRows = completedBookings.slice(0, 2).map((b, i) => ({
        booking_id: b.id,
        product_id: products[i % products.length].id,
        tenant_id: tenant.id,
        unit_price: products[i % products.length].price,
        quantity: 1,
      }));
      const { error: bpError } = await admin.from("booking_products").insert(bookingProductRows);
      if (bpError) throw bpError;
    }

    return json({ success: true, tenant_id: tenant.id, slug: tenant.slug });
  } catch (err) {
    console.error("generate-demo-tenant error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
