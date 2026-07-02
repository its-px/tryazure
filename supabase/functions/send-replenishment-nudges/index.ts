// Supabase Edge Function: send-replenishment-nudges
// Cron-triggered daily. For each booking_products row whose product has a
// replenish_days interval, and purchased_at + replenish_days falls ~today,
// sends an SMS nudging the customer to rebuy. Tracks replenishment_sent_at
// to avoid double-sends (same convention as rebooking_nudge_sent_at /
// review_requested_at).
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { isReplenishmentDue } from "./replenishment.ts";

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
    const gatewayApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER") || "px business";

    if (!gatewayApiKey) {
      return new Response(
        JSON.stringify({ error: "SMS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: purchases, error: purchasesError } = await supabase
      .from("booking_products")
      .select(
        "id, booking_id, purchased_at, quantity, replenishment_sent_at, products!inner(name, replenish_days), bookings!inner(user_id, tenant_id)",
      )
      .is("replenishment_sent_at", null)
      .not("products.replenish_days", "is", null);

    if (purchasesError) {
      console.error("Error fetching booking_products:", purchasesError);
      return new Response(JSON.stringify({ error: purchasesError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    const results: Array<{ id: string; status: string }> = [];

    for (const row of purchases || []) {
      const product = row.products as { name: string; replenish_days: number };
      const booking = row.bookings as { user_id: string; tenant_id: string };
      const purchasedAt = new Date(row.purchased_at as string);

      if (!isReplenishmentDue(purchasedAt, product.replenish_days)) continue;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone")
        .eq("id", booking.user_id)
        .single();

      if (profileError || !profile?.phone) {
        results.push({ id: row.id, status: "no_phone" });
        continue;
      }

      let formattedPhone = String(profile.phone).replace(/\D/g, "");
      if (!formattedPhone.startsWith("30")) formattedPhone = "30" + formattedPhone;

      const message = `Time to restock your ${product.name}? Book again to pick up more. Thank you!`;

      const gatewayResponse = await fetch("https://gatewayapi.com/rest/mtsms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${gatewayApiKey}`,
        },
        body: JSON.stringify({
          sender: smsSender,
          message,
          encoding: "UCS2",
          recipients: [{ msisdn: parseInt(formattedPhone, 10) }],
          priority: "NORMAL",
        }),
      });

      if (!gatewayResponse.ok) {
        const errData = await gatewayResponse.text();
        console.error(`Gateway error for booking_product ${row.id}:`, errData);
        results.push({ id: row.id, status: "sms_failed" });
        continue;
      }

      const { error: updateError } = await supabase
        .from("booking_products")
        .update({ replenishment_sent_at: new Date().toISOString() })
        .eq("id", row.id);

      if (updateError) {
        console.error(`Error updating booking_product ${row.id}:`, updateError);
      }

      sent++;
      results.push({ id: row.id, status: "sent" });
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
