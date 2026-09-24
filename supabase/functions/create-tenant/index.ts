// Supabase Edge Function: create-tenant
// Self-serve business signup. A signed-in plain user ('user' role) creates their own
// tenant at <slug>.pxbs.site and becomes its owner. The 30-day trial row in
// tenant_billing is created by the tenants_create_billing trigger (20260922 migration).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { clientIp, rateLimit, tooManyRequests } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_DOMAIN = "pxbs.site";
const RESERVED = new Set([
  "www", "admin", "api", "app", "mail", "smtp", "ftp", "cdn", "static", "assets",
  "dashboard", "billing", "help", "support", "status", "blog", "docs", "owner", "signup",
]);

// ponytail: same rules as my-app/src/components/tenantSlug.ts (client-side UX copy,
// tested there). Keep the two in sync; this one is authoritative.
export function slugError(slug: string): string | null {
  if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(slug)) {
    return "Use 3-30 lowercase letters, numbers or hyphens (no hyphen at the start or end)";
  }
  if (slug.includes("--")) return "Hyphens can't be doubled";
  // demo- slugs are reserved for AdminPanel demo tenants (resolvable via ?tenant=, deletable).
  if (RESERVED.has(slug) || slug.startsWith("demo")) return "That address is reserved";
  return null;
}

const text = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await rateLimit(admin, `create-tenant:${clientIp(req)}`, 5, 3600))) {
      return tooManyRequests(corsHeaders);
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return json({ error: "Please complete your profile first" }, 400);
    // Customers ('user') may carry a tenant_id from booking elsewhere — that's fine.
    // Anyone already staff/owner/admin can't open a second business.
    if (profile.role !== "user") {
      return json({ error: "This account already belongs to a business" }, 409);
    }

    const body = await req.json().catch(() => ({}));
    const name = text(body.name, 80);
    const slug = text(body.slug, 30).toLowerCase();
    const phone = text(body.phone, 30);
    const address = text(body.address, 200);
    if (name.length < 2) return json({ error: "Business name is required" }, 400);
    const slugProblem = slugError(slug);
    if (slugProblem) return json({ error: slugProblem }, 400);

    const { data: tenant, error: tenantError } = await admin
      .from("tenants")
      .insert({
        slug,
        name,
        domain: `${slug}.${BASE_DOMAIN}`,
        // No colors/logo: the app falls back to DEFAULT_BRAND_COLORS, and the owner's
        // onboarding checklist treats a set primaryColor/logoUrl as "branding done".
        config: { businessInfo: { phone, address } },
      })
      .select("id")
      .single();
    if (tenantError) {
      // 23505 = unique_violation on tenants_slug_key / tenants_domain_key
      if (tenantError.code === "23505") return json({ error: "That address is already taken" }, 409);
      throw tenantError;
    }

    // Service role: prevent_role_escalation sees auth.uid() = NULL and lets this through.
    // The role = 'user' guard makes a concurrent second signup update 0 rows.
    const { data: updated, error: profileError } = await admin
      .from("profiles")
      .update({ role: "owner", tenant_id: tenant.id })
      .eq("id", userId)
      .eq("role", "user")
      .select("id");
    if (profileError || !updated?.length) {
      await admin.from("tenants").delete().eq("id", tenant.id); // tenant_billing cascades
      if (profileError) throw profileError;
      return json({ error: "This account already belongs to a business" }, 409);
    }

    return json({ success: true, slug, url: `https://${slug}.${BASE_DOMAIN}/owner` });
  } catch (err) {
    console.error("create-tenant error:", err);
    return json({ error: "Could not create your business, please try again" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
