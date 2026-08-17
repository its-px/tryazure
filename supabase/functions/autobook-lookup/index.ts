// Supabase Edge Function: autobook-lookup
// Public, unauthenticated endpoint hit by the one-tap "book again" links sent
// in booking SMS confirmations. Looks up the ORIGINAL booking by its
// autobook_token (not by id — guessable/enumerable) and returns just enough
// to pre-fill the wizard (service/professional/location). No date/time is
// returned — that must be freshly checked for availability by the caller.
// Mirrors booking-sms-action's token-lookup pattern exactly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit, clientIp, tooManyRequests } from "../_shared/rateLimit.ts";

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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Public endpoint keyed by a guessable-if-brute-forced token — throttle per IP.
    if (!(await rateLimit(supabase, `autobook-lookup:${clientIp(req)}`, 10, 60))) {
      return tooManyRequests(corsHeaders);
    }

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("services, professional_id, location, tenant_id")
      .eq("autobook_token", token)
      .single();

    if (error || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found or link expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, booking }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
