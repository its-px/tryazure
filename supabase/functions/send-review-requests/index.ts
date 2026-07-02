// Supabase Edge Function: send-review-requests
// Cron-triggered daily. For each tenant with a configured Google review link,
// emails customers whose booking was completed >=2h ago and hasn't already
// gotten a review request.
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
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Bookings completed >=2h ago, matched to the transition that completed them.
    const { data: history, error: historyError } = await supabase
      .from("booking_status_history")
      .select(
        "booking_id, changed_at, bookings!inner(id, tenant_id, user_id, status, review_requested_at, tenants!inner(name, config))",
      )
      .eq("new_status", "completed")
      .lte("changed_at", twoHoursAgo);

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
        review_requested_at: string | null;
        tenants: { name: string; config: Record<string, unknown> };
      };

      if (
        booking.status !== "completed" ||
        booking.review_requested_at ||
        !booking.user_id
      ) {
        continue;
      }

      const reviewUrl = booking.tenants?.config?.googleReviewUrl as
        | string
        | undefined;
      if (!reviewUrl) continue;

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
          subject: `How was your visit to ${tenantName}?`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <p>Hi ${displayName},</p>
                  <p>Thanks for visiting ${tenantName}! If you have a minute, a quick review helps us a lot.</p>
                  <p style="text-align: center; margin: 24px 0;">
                    <a href="${reviewUrl}" style="display: inline-block; padding: 12px 28px; background-color: #2e7d32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Leave a Review</a>
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
        .update({ review_requested_at: new Date().toISOString() })
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
