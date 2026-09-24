// Supabase Edge Function: manage-booking-lifecycle
// Schedule: every 15 minutes via Supabase Dashboard → Edge Functions → Schedule
// Cron expression: */15 * * * *
//
// What it does:
//   1. Expires pending bookings where confirmation_deadline has passed (8h before start)
//   2. Marks confirmed bookings as completed when their end_time has passed
//   3. Cancels card bookings still unpaid 60 min after creation (frees the slot)
//   4. Data retention (stated in the privacy policy): deletes SMS logs older
//      than 12 months and unlinks bookings older than 5 years from the person

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "none",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // This function mutates booking state (expires/completes bookings) and is meant to be
  // invoked only by the scheduled cron trigger, which authenticates with the service role
  // key. Reject any caller that isn't presenting that key, so it can't be triggered by
  // arbitrary anon/authenticated clients (it was previously wide open, wildcard CORS included).
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${supabaseKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 401,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prune stale rate-limit counters (piggybacks on this 15-min cron).
    await supabase
      .from("rate_limits")
      .delete()
      .lt("window_start", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

    // --- 1. Expire pending bookings past their deadline ---
    const { data: expiredResult, error: expireError } = await supabase.rpc(
      "expire_unconfirmed_bookings",
    );
    if (expireError) {
      console.error("Error expiring bookings:", expireError);
    } else {
      console.log(`Expired ${expiredResult} unconfirmed bookings`);
    }

    // --- 2. Complete confirmed bookings whose end_time has passed ---
    const { data: completedResult, error: completeError } = await supabase.rpc(
      "complete_past_bookings",
    );
    if (completeError) {
      console.error("Error completing bookings:", completeError);
    } else {
      console.log(`Completed ${completedResult} past bookings`);
    }

    // --- 3. Cancel abandoned card payments ---
    // booking-payment only opens checkout within 30 min of booking and sessions
    // expire 30 min later, so after 60 min no payment can still land.
    // created_at is timestamp without time zone (UTC), hence no "Z".
    const unpaidCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 19);
    const { data: abandoned, error: abandonError } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("payment_method", "card")
      .eq("payment_status", "unpaid")
      .in("status", ["pending", "confirmed"])
      .lt("created_at", unpaidCutoff)
      .select("id");
    if (abandonError) {
      console.error("Error cancelling unpaid card bookings:", abandonError);
    } else {
      console.log(`Cancelled ${abandoned?.length ?? 0} unpaid card bookings`);
    }

    // --- 4. Retention ---
    const monthsAgo = (m: number) => {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      return d;
    };
    const { error: smsRetentionError } = await supabase
      .from("sms_logs")
      .delete()
      .lt("created_at", monthsAgo(12).toISOString());
    if (smsRetentionError) console.error("SMS log retention failed:", smsRetentionError);
    const { error: bookingRetentionError } = await supabase
      .from("bookings")
      .update({ user_id: null })
      .lt("date", monthsAgo(60).toISOString().slice(0, 10))
      .not("user_id", "is", null);
    if (bookingRetentionError) console.error("Booking retention failed:", bookingRetentionError);

    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredResult ?? 0,
        completed: completedResult ?? 0,
        cancelledUnpaid: abandoned?.length ?? 0,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("Lifecycle function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
