// Supabase Edge Function: invite-staff
// Owner-only. Invites a staff member (an existing professionals row of the caller's
// tenant) to log in: sends a Supabase invite email, links the new auth user to the
// professional (professionals.user_id) and makes their profile role='professional'.
//   { professionalId, email, redirectTo } -> { ok: true }
// Requires migration 20260924_staff_logins.sql.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: owner } = await admin
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userData.user.id)
      .single();
    if (!owner || owner.role !== "owner" || !owner.tenant_id) {
      return json({ error: "Forbidden" }, 403);
    }

    const { professionalId, email, redirectTo } = await req.json();
    const cleanEmail = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return json({ error: "Invalid email" }, 400);
    }
    let redirect: string | undefined;
    if (redirectTo) {
      const u = new URL(redirectTo);
      if (u.protocol !== "https:" && u.hostname !== "localhost") {
        return json({ error: "Invalid redirectTo" }, 400);
      }
      redirect = u.toString(); // must also be in Auth → URL Configuration → Redirect URLs
    }

    // Scoped to the caller's tenant: an owner can only invite their own staff.
    const { data: pro } = await admin
      .from("professionals")
      .select("id, code, name, user_id")
      .eq("id", professionalId)
      .eq("tenant_id", owner.tenant_id)
      .single();
    if (!pro) return json({ error: "Staff member not found" }, 404);
    if (pro.user_id) return json({ error: "This staff member already has a login" }, 409);

    // ponytail: new accounts only. Converting an existing account (maybe a client
    // of another business, or an owner) would let owners hijack accounts by email;
    // add an accept-invite flow if staff with existing accounts need linking.
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();
    if (existing) {
      return json({ error: "This email already has an account. Use a different email." }, 409);
    }

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      cleanEmail,
      {
        // ProfessionalPanel reads professional_code from user_metadata (display only;
        // RLS keys on professionals.user_id).
        data: { professional_code: pro.code, full_name: pro.name },
        redirectTo: redirect,
      },
    );
    if (inviteError || !invited?.user) {
      const exists = /already|registered/i.test(inviteError?.message ?? "");
      return json(
        { error: exists ? "This email already has an account. Use a different email." : "Could not send invite" },
        exists ? 409 : 500,
      );
    }
    const uid = invited.user.id;

    // handle_new_user creates the profile row with role 'user'; the service role
    // passes prevent_role_escalation (auth.uid() is null here).
    const { error: profileError } = await admin
      .from("profiles")
      .upsert({ id: uid, email: cleanEmail, full_name: pro.name, role: "professional", tenant_id: owner.tenant_id });
    const { error: linkError } = profileError
      ? { error: null }
      : await admin.from("professionals").update({ user_id: uid }).eq("id", pro.id).is("user_id", null);
    if (profileError || linkError) {
      console.error("[invite-staff] link failed", profileError ?? linkError);
      await admin.auth.admin.deleteUser(uid); // don't leave a half-linked login behind
      return json({ error: "Could not link staff login" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("[invite-staff]", err);
    return json({ error: "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
