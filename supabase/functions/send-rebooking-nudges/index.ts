// Supabase Edge Function: send-rebooking-nudges
// Cron-triggered daily. For each tenant, emails customers whose booking was
// completed exactly `rebookingNudgeDays` (config, default 45) days ago and who
// haven't booked again since, nudging them to book again.
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

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

    // Completion transitions, joined to their booking + tenant.
    const { data: history, error: historyError } = await supabase
      .from("booking_status_history")
      .select(
        "booking_id, changed_at, bookings!inner(id, tenant_id, user_id, status, date, booking_date, rebooking_nudge_sent_at, tenants!inner(name, config))",
      )
      .eq("new_status", "completed");

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
        tenants: { name: string; config: Record<string, unknown> };
      };

      if (
        booking.status !== "completed" ||
        booking.rebooking_nudge_sent_at ||
        !booking.user_id
      ) {
        continue;
      }

      const nudgeDays =
        Number(booking.tenants?.config?.rebookingNudgeDays) || DEFAULT_NUDGE_DAYS;

      // changed_at falls within a ~24h window centered on "N days ago".
      const changedAt = new Date(row.changed_at as string);
      const daysAgo =
        (Date.now() - changedAt.getTime()) / (24 * 60 * 60 * 1000);
      if (daysAgo < nudgeDays || daysAgo >= nudgeDays + 1) continue;

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
      const displayName = profile.full_name || "there";

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "team@pxbs.site",
          to: profile.email,
          subject: `Time for another visit to ${tenantName}?`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <p>Hi ${displayName},</p>
                  <p>It's been a while since your last visit to ${tenantName}. We'd love to see you again!</p>
                  <p style="text-align: center; margin: 24px 0;">
                    <a href="https://${tenantName.toLowerCase().replace(/\s+/g, "-")}.pxbs.site" style="display: inline-block; padding: 12px 28px; background-color: #2e7d32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Again</a>
                  </p>
                  <p>Thank you!</p>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        console.error(`Resend error for booking ${booking.id}:`, errData);
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
