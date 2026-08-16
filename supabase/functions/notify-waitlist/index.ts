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

// ponytail: bound the scan to the next 2 weeks instead of unbounded future —
// upgrade to a longer window if tenants report waitlist entries going stale.
const DAYS_AHEAD = 14;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Cron-only: reject callers not presenting the service role key (see manage-booking-lifecycle).
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
        "id, tenant_id, user_id, service_id, professional_id, preferred_date, services(duration_minutes, name), tenants(name, domain)",
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

    // Memoize per run: entries for the same tenant/professional/date/duration
    // shouldn't re-hit the slots RPC (this loop was an N+1 storm otherwise).
    const slotCache = new Map<string, boolean>();
    const prosByTenant = new Map<string, string[]>();

    for (const entry of entries || []) {
      const service = entry.services as { duration_minutes: number; name: string } | null;
      const tenant = entry.tenants as { name: string; domain: string | null } | null;
      if (!service?.duration_minutes) {
        results.push({ entry_id: entry.id, status: "no_service_duration" });
        continue;
      }

      // Which professionals to check: the requested one, or every professional
      // for this tenant if the customer said "any professional".
      // get_available_slots (and everything else in the app) keys professionals
      // by their text CODE, not the uuid id — waitlist entries store the code too.
      let professionalIds: string[] = [];
      if (entry.professional_id) {
        professionalIds = [entry.professional_id];
      } else {
        let codes = prosByTenant.get(entry.tenant_id);
        if (!codes) {
          const { data: pros } = await supabase
            .from("professionals")
            .select("code")
            .eq("tenant_id", entry.tenant_id);
          codes = (pros || []).map((p: { code: string }) => p.code);
          prosByTenant.set(entry.tenant_id, codes);
        }
        professionalIds = codes;
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
          const cacheKey = `${entry.tenant_id}|${profId}|${date}|${service.duration_minutes}`;
          let hasSlots = slotCache.get(cacheKey);
          if (hasSlots === undefined) {
            const { data: slots, error: slotsError } = await supabase.rpc(
              "get_available_slots",
              {
                p_professional_id: profId,
                p_date: date,
                p_service_duration_minutes: service.duration_minutes,
                p_tenant_id: entry.tenant_id,
              },
            );
            hasSlots = !slotsError && !!slots && slots.length > 0;
            slotCache.set(cacheKey, hasSlots);
          }
          if (hasSlots) {
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

      const ok = await sendEmail(
        resendApiKey,
        profile.email,
        `A slot opened up for ${service.name} at ${tenantName}`,
        {
          greetingName: profile.full_name || "there",
          bodyText: `Good news — a slot opened up around ${foundSlot.date} for ${service.name} at ${tenantName}. You were on the waitlist for this, so grab it before someone else does!`,
          ctaLabel: "Book Now",
          ctaUrl: tenantBookingUrl(tenant),
        },
      );

      if (!ok) {
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
