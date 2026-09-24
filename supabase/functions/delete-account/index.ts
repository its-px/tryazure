// Supabase Edge Function: delete-account
// GDPR art. 17: a client deletes their own account. Bookings are kept for the
// businesses' records but lose the link to the person (bookings.user_id is
// ON DELETE SET NULL); the profile cascades with the auth user.
// Owners/professionals/admins are refused: their accounts hold tenant data and
// go through support instead.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const auth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: userData, error: authError } = await auth.auth.getUser(token);
  const user = userData?.user;
  if (authError || !user) return json({ success: false, error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: profile } = await admin
    .from("profiles")
    .select("role, phone")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role && profile.role !== "user") {
    return json({ success: false, error: "Business accounts are closed through support." }, 403);
  }

  // SMS logs hold the phone number and message text. Match on the last 10
  // digits because stored formats vary (+30…, 30…, 69…).
  const digits = String(profile?.phone ?? user.phone ?? "").replace(/\D/g, "").slice(-10);
  if (digits.length === 10) {
    const { error } = await admin.from("sms_logs").delete().like("recipient_phone", `%${digits}`);
    if (error) console.error("sms_logs cleanup failed:", error);
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ success: false, error: error.message }, 500);
  return json({ success: true });
});
