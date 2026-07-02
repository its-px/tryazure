// Supabase Edge Function: notify-waitlist
// Cron-triggered periodically. For each tenant, scans open waitlist entries
// (status='waiting') and checks whether a slot has freed up for them using
// the same get_available_slots RPC the booking wizard uses client-side —
// ponytail: reuses existing slot logic instead of re-deriving availability
// in SQL. Emails the customer when a match is found, marks status='notified'.
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

// ponytail: bound the scan to the next 2 weeks instead of unbounded future —
// upgrade to a longer window if tenants report waitlist entries going stale.
const DAYS_AHEAD = 14;

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

    const { data: entries, error: entriesError } = await supabase
      .from("waitlist_entries")
      .select(
        "id, tenant_id, user_id, service_id, professional_id, preferred_date, services(duration_minutes, name), tenants(name)",
      )
      .eq("status", "waiting");

    if (entriesError) {
      console.error("Error fetching waitlist entries:", entriesError);
      return new Response(JSON.stringify({ error: entriesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notified = 0;
    const results: Array<{ entry_id: string; status: string }> = [];

    for (const entry of entries || []) {
      const service = entry.services as { duration_minutes: number; name: string } | null;
      const tenant = entry.tenants as { name: string } | null;
      if (!service?.duration_minutes) {
        results.push({ entry_id: entry.id, status: "no_service_duration" });
        continue;
      }

      // Which professionals to check: the requested one, or every professional
      // for this tenant if the customer said "any professional".
      let professionalIds: string[] = [];
      if (entry.professional_id) {
        professionalIds = [entry.professional_id];
      } else {
        const { data: pros } = await supabase
          .from("professionals")
          .select("id")
          .eq("tenant_id", entry.tenant_id);
        professionalIds = (pros || []).map((p: { id: string }) => p.id);
      }

      // Which dates to check: the requested one, or the next DAYS_AHEAD days.
      const dates: string[] = entry.preferred_date
        ? [entry.preferred_date]
        : Array.from({ length: DAYS_AHEAD }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            return d.toISOString().split("T")[0];
          });

      let foundSlot: { date: string } | null = null;
      outer: for (const date of dates) {
        for (const profId of professionalIds) {
          const { data: slots, error: slotsError } = await supabase.rpc(
            "get_available_slots",
            {
              p_professional_id: profId,
              p_date: date,
              p_service_duration_minutes: service.duration_minutes,
              p_tenant_id: entry.tenant_id,
            },
          );
          if (slotsError) continue;
          if (slots && slots.length > 0) {
            foundSlot = { date };
            break outer;
          }
        }
      }

      if (!foundSlot) {
        results.push({ entry_id: entry.id, status: "no_match" });
        continue;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", entry.user_id)
        .single();

      if (profileError || !profile?.email) {
        results.push({ entry_id: entry.id, status: "no_email" });
        continue;
      }

      const tenantName = tenant?.name || "us";
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
          subject: `A slot opened up for ${service.name} at ${tenantName}`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                  <p>Hi ${displayName},</p>
                  <p>Good news — a slot opened up around ${foundSlot.date} for ${service.name} at ${tenantName}. You were on the waitlist for this, so grab it before someone else does!</p>
                  <p style="text-align: center; margin: 24px 0;">
                    <a href="https://${tenantName.toLowerCase().replace(/\s+/g, "-")}.pxbs.site" style="display: inline-block; padding: 12px 28px; background-color: #2e7d32; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Book Now</a>
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
        console.error(`Resend error for waitlist entry ${entry.id}:`, errData);
        results.push({ entry_id: entry.id, status: "email_failed" });
        continue;
      }

      const { error: updateError } = await supabase
        .from("waitlist_entries")
        .update({ status: "notified", notified_at: new Date().toISOString() })
        .eq("id", entry.id);

      if (updateError) {
        console.error(`Error updating waitlist entry ${entry.id}:`, updateError);
      }

      notified++;
      results.push({ entry_id: entry.id, status: "notified" });
    }

    return new Response(JSON.stringify({ success: true, notified, results }), {
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
