// Supabase Edge Function: send-rebooking-nudges
// Cron-triggered daily. For each tenant, emails customers whose booking was
// completed exactly `rebookingNudgeDays` (config, default 45) days ago and who
// haven't booked again since, nudging them to book again.
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore - relative Deno import
import { sendEmail, tenantBookingUrl } from "../_shared/sendEmail.ts";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_NUDGE_DAYS = 45;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Manual on-demand trigger from the owner dashboard "Send Win-Back" button:
    // skip the day-window/gate logic (which only fires the cron sweep on the
    // exact Nth day) and process this one booking directly.
    // ponytail: reuses the same completed-booking-> email path below instead of
    // a separate send-email edge function.
    let manualBookingId: string | null = null;
    let manualTenantFilter: string | null = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body?.booking_id) manualBookingId = body.booking_id;
      } catch {
        // no body / not JSON — fall through to normal cron sweep
      }
    }

    // The manual path bypasses the once-only nudge gate, so it must not be
    // callable by anyone holding the anon key: require an owner/admin caller,
    // and scope owners to their own tenant's bookings.
    if (manualBookingId) {
      const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
      const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
      if (authError || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: callerProfile } = await supabase
        .from("profiles")
        .select("role, tenant_id")
        .eq("id", userData.user.id)
        .single();
      if (!callerProfile || (callerProfile.role !== "admin" && callerProfile.role !== "owner")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (callerProfile.role === "owner") manualTenantFilter = callerProfile.tenant_id;
    }

    // Completion transitions, joined to their booking + tenant.
    let historyQuery = supabase
      .from("booking_status_history")
      .select(
        "booking_id, changed_at, bookings!inner(id, tenant_id, user_id, status, date, booking_date, rebooking_nudge_sent_at, tenants!inner(name, config, domain))",
      )
      .eq("new_status", "completed");
    if (manualBookingId) {
      historyQuery = historyQuery.eq("booking_id", manualBookingId);
    }
    const { data: history, error: historyError } = await historyQuery;

    if (historyError) {
      console.error("Error fetching completed bookings:", historyError);
      return new Response(JSON.stringify({ error: historyError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const results: Array<{ booking_id: string; status: string }> = [];

    for (const row of history || []) {
      const booking = row.bookings as {
        id: string;
        tenant_id: string;
        user_id: string;
        status: string;
        date: string | null;
        booking_date: string | null;
        rebooking_nudge_sent_at: string | null;
        tenants: { name: string; config: Record<string, unknown>; domain: string | null };
      };

      if (
        booking.status !== "completed" ||
        (booking.rebooking_nudge_sent_at && !manualBookingId) ||
        !booking.user_id ||
        (manualTenantFilter && booking.tenant_id !== manualTenantFilter)
      ) {
        continue;
      }

      if (!manualBookingId) {
        const nudgeDays =
          Number(booking.tenants?.config?.rebookingNudgeDays) ||
          DEFAULT_NUDGE_DAYS;

        // changed_at falls within a ~24h window centered on "N days ago".
        const changedAt = new Date(row.changed_at as string);
        const daysAgo =
          (Date.now() - changedAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysAgo < nudgeDays || daysAgo >= nudgeDays + 1) continue;
      }

      const bookingDate = booking.date || booking.booking_date;

      // Skip if the customer already has a later booking with this tenant.
      const { data: laterBookings, error: laterError } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", booking.tenant_id)
        .eq("user_id", booking.user_id)
        .gt("date", bookingDate)
        .limit(1);

      if (laterError) {
        console.error(`Error checking rebookings for ${booking.id}:`, laterError);
        continue;
      }
      if (laterBookings && laterBookings.length > 0) continue;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", booking.user_id)
        .single();

      if (profileError || !profile?.email) {
        results.push({ booking_id: booking.id, status: "no_email" });
        continue;
      }

      const tenantName = booking.tenants?.name || "us";

      const ok = await sendEmail(
        resendApiKey,
        profile.email,
        `Time for another visit to ${tenantName}?`,
        {
          greetingName: profile.full_name || "there",
          bodyText: `It's been a while since your last visit to ${tenantName}. We'd love to see you again!`,
          ctaLabel: "Book Again",
          ctaUrl: tenantBookingUrl(booking.tenants),
        },
      );

      if (!ok) {
        results.push({ booking_id: booking.id, status: "email_failed" });
        continue;
      }

      const { error: updateError } = await supabase
        .from("bookings")
        .update({ rebooking_nudge_sent_at: new Date().toISOString() })
        .eq("id", booking.id);

      if (updateError) {
        console.error(`Error updating booking ${booking.id}:`, updateError);
      }

      sent++;
      results.push({ booking_id: booking.id, status: "sent" });
    }

    return new Response(JSON.stringify({ success: true, sent, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Function Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
