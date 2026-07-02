// Supabase Edge Function: booking-sms-action
// Public, unauthenticated endpoint hit by the one-tap confirm/cancel links
// sent in booking SMS/emails. Validates the per-booking sms_action_token
// (not the booking id itself, which is guessable/enumerable) before
// mutating status. No login required — that's the point of a one-tap link.

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
    const { token, action } = await req.json();

    if (!token || !["confirm", "cancel"].includes(action)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status, confirmation_deadline")
      .eq("sms_action_token", token)
      .single();

    if (fetchError || !booking) {
      return new Response(
        JSON.stringify({ success: false, error: "Booking not found or link expired" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (booking.status !== "pending" && booking.status !== "confirmed") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `This booking is already ${booking.status} and can't be changed.`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (
      action === "confirm" &&
      booking.confirmation_deadline &&
      new Date(booking.confirmation_deadline).getTime() < Date.now()
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "The confirmation deadline has passed." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Reschedule is out of scope for this pass: cancel + let the customer
    // rebook through the normal wizard. ponytail: smallest correct version.
    const newStatus = action === "confirm" ? "confirmed" : "cancelled";
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "confirmed") update.confirmed_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("bookings")
      .update(update)
      .eq("id", booking.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ success: false, error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
