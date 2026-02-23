// Supabase Edge Function: manage-booking-lifecycle
// Schedule: every 15 minutes via Supabase Dashboard → Edge Functions → Schedule
// Cron expression: */15 * * * *
//
// What it does:
//   1. Expires pending bookings where confirmation_deadline has passed (8h before start)
//   2. Marks confirmed bookings as completed when their end_time has passed

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
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    return new Response(
      JSON.stringify({
        success: true,
        expired: expiredResult ?? 0,
        completed: completedResult ?? 0,
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
