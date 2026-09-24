// Supabase Edge Function: booking-payment
// Client pays for their own booking by card. Creates a Stripe Checkout Session as a
// DIRECT charge on the tenant's connected Stripe account, so the money lands in the
// tenant's Stripe balance, never the platform's. stripe-webhook marks the booking paid.
//   { bookingId, returnUrl } -> { url }
// The amount is always recomputed here from services/products prices; nothing
// price-related is trusted from the client.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
// Tenant picks its currency via tenants.config.currency; anything unknown falls back to EUR.
const CURRENCIES = ["eur", "usd", "gbp", "chf", "sek", "dkk", "nok", "pln", "czk", "huf", "ron", "bgn"];
// Unpaid card bookings are cancelled by manage-booking-lifecycle after
// PAY_WINDOW + checkout expiry (see there), so the slot frees up.
const PAY_WINDOW_MS = 30 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { bookingId, returnUrl } = await req.json();
    const url = new URL(returnUrl);
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return json({ error: "Invalid returnUrl" }, 400);
    }

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: booking } = await admin
      .from("bookings")
      .select("id, user_id, tenant_id, services, date, start_time, payment_method, payment_status, status, created_at")
      .eq("id", bookingId)
      .single();
    if (!booking || booking.user_id !== userData.user.id) {
      return json({ error: "Booking not found" }, 404);
    }
    if (booking.payment_method !== "card" || booking.payment_status !== "unpaid") {
      return json({ error: "Booking is not awaiting card payment" }, 400);
    }
    // created_at is timestamp without time zone (UTC).
    if (
      booking.status === "cancelled" || booking.status === "expired" ||
      Date.now() - Date.parse(booking.created_at + "Z") > PAY_WINDOW_MS
    ) {
      return json({ error: "Payment window has expired, please book again" }, 400);
    }

    const { data: tenantRow } = await admin
      .from("tenants")
      .select("config")
      .eq("id", booking.tenant_id)
      .single();
    const configured = String(tenantRow?.config?.currency ?? "").toLowerCase();
    const CURRENCY = CURRENCIES.includes(configured) ? configured : "eur";

    const { data: billing } = await admin
      .from("tenant_billing")
      .select("stripe_connect_account_id, connect_charges_enabled")
      .eq("tenant_id", booking.tenant_id)
      .single();
    if (!billing?.stripe_connect_account_id || !billing.connect_charges_enabled) {
      return json({ error: "This business does not accept card payments" }, 400);
    }

    // bookings.services is a JSON-encoded array of service ids (see UserPanel).
    let serviceIds: string[] = [];
    try {
      const parsed = typeof booking.services === "string" ? JSON.parse(booking.services) : booking.services;
      serviceIds = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      serviceIds = [String(booking.services)];
    }
    const { data: services } = await admin
      .from("services")
      .select("id, name, price, tenant_id")
      .in("id", serviceIds);

    const { data: bookedProducts } = await admin
      .from("booking_products")
      .select("product_id, quantity")
      .eq("booking_id", booking.id);
    const { data: products } = bookedProducts?.length
      ? await admin
          .from("products")
          .select("id, name, price")
          .eq("tenant_id", booking.tenant_id)
          .in("id", bookedProducts.map((bp) => bp.product_id))
      : { data: [] };

    const toCents = (n: unknown) => Math.round(Number(n ?? 0) * 100);
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const s of services ?? []) {
      // Shared services have tenant_id NULL; anything else must belong to this tenant.
      if (s.tenant_id && s.tenant_id !== booking.tenant_id) continue;
      if (toCents(s.price) <= 0) continue;
      lineItems.push({
        quantity: 1,
        price_data: { currency: CURRENCY, unit_amount: toCents(s.price), product_data: { name: s.name } },
      });
    }
    for (const bp of bookedProducts ?? []) {
      const product = products?.find((p) => p.id === bp.product_id);
      if (!product || toCents(product.price) <= 0 || bp.quantity <= 0) continue;
      lineItems.push({
        quantity: bp.quantity,
        price_data: { currency: CURRENCY, unit_amount: toCents(product.price), product_data: { name: product.name } },
      });
    }
    if (lineItems.length === 0) return json({ error: "Nothing to pay for" }, 400);

    const success = new URL(url);
    success.searchParams.set("payment", "success");
    const cancel = new URL(url);
    cancel.searchParams.set("payment", "cancel");

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        // Stripe's minimum; with PAY_WINDOW this bounds payment to created_at + 60 min.
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        line_items: lineItems,
        customer_email: userData.user.email,
        metadata: { booking_id: booking.id, tenant_id: booking.tenant_id },
        payment_intent_data: {
          description: `Booking ${booking.date} ${String(booking.start_time).slice(0, 5)}`,
          metadata: { booking_id: booking.id },
        },
        success_url: success.toString(),
        cancel_url: cancel.toString(),
      },
      { stripeAccount: billing.stripe_connect_account_id },
    );

    await admin
      .from("bookings")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", booking.id);

    return json({ url: session.url });
  } catch (err) {
    console.error("[booking-payment]", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
