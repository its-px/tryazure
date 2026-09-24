// Supabase Edge Function: unsubscribe
// Public opt-out for marketing messages (Law 3471/2006 art. 11). Keyed by the
// unguessable profiles.unsubscribe_token. Two callers:
//  - the app's /unsubscribe page: POST JSON { token }
//  - mail clients' one-click List-Unsubscribe (RFC 8058): POST ?t=<token>
// Deploy with --no-verify-jwt (mail clients send no JWT).
// Only POST mutates, so link scanners that prefetch GETs can't unsubscribe anyone.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405);

  let token = new URL(req.url).searchParams.get("t");
  if (!token && req.headers.get("content-type")?.includes("application/json")) {
    token = (await req.json().catch(() => ({})))?.token ?? null;
  }
  if (!token || !UUID.test(token)) return json({ success: false, error: "Invalid link" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase
    .from("profiles")
    .update({ marketing_opt_out: true })
    .eq("unsubscribe_token", token)
    .select("id");
  if (error) return json({ success: false, error: error.message }, 500);
  if (!data?.length) return json({ success: false, error: "Invalid link" }, 404);
  return json({ success: true });
});
