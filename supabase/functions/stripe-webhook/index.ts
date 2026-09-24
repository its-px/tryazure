// Supabase Edge Function: stripe-webhook
// Stripe → DB sync. Called by Stripe, not the app, so deploy with --no-verify-jwt;
// authenticity comes from the Stripe signature. Two Stripe endpoints point here:
//   - "Your account" endpoint (STRIPE_WEBHOOK_SECRET): platform subscriptions
//   - "Connected accounts" endpoint (STRIPE_CONNECT_WEBHOOK_SECRET): client card
//     payments on tenants' own Stripe accounts + their onboarding status
//   supabase functions deploy stripe-webhook --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@18";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const PLAN_BY_PRICE: Record<string, string> = {
  [Deno.env.get("STRIPE_PRICE_BASIC") ?? "-"]: "basic",
  [Deno.env.get("STRIPE_PRICE_PRO") ?? "-"]: "pro",
};

Deno.serve(async (req) => {
  const signature = req.headers.get("Stripe-Signature");
  const body = await req.text();

  let event: Stripe.Event | null = null;
  for (const secret of [
    Deno.env.get("STRIPE_WEBHOOK_SECRET"),
    Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET"),
  ]) {
    if (!secret) continue;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature!, secret, undefined, cryptoProvider);
      break;
    } catch {
      // try the next endpoint's secret
    }
  }
  if (!event) {
    console.error("[stripe-webhook] bad signature");
    return new Response("Bad signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ── Connected accounts (tenants' own Stripe) ──
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await admin
      .from("tenant_billing")
      .update({ connect_charges_enabled: !!account.charges_enabled })
      .eq("stripe_connect_account_id", account.id);
    return new Response("ok", { status: 200 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;
    // Only trust booking payments that came from a connected account's own session.
    if (!bookingId || !event.account || session.payment_status !== "paid") {
      return new Response("ignored", { status: 200 });
    }
    const { error } = await admin
      .from("bookings")
      .update({ payment_status: "paid" })
      .eq("id", bookingId)
      .eq("stripe_checkout_session_id", session.id);
    if (error) {
      console.error("[stripe-webhook] booking update failed", error);
      return new Response("db error", { status: 500 });
    }
    return new Response("ok", { status: 200 });
  }

  if (event.type === "charge.refunded" && event.account) {
    const charge = event.data.object as Stripe.Charge;
    // booking_id lives on the PaymentIntent (payment_intent_data.metadata), not the charge.
    const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
    const pi = piId ? await stripe.paymentIntents.retrieve(piId, { stripeAccount: event.account }) : null;
    const bookingId = pi?.metadata?.booking_id;
    if (bookingId && charge.refunded) { // full refunds only
      await admin.from("bookings").update({ payment_status: "refunded" }).eq("id", bookingId);
    }
    return new Response("ok", { status: 200 });
  }

  // ── Platform subscriptions ──
  if (!event.type.startsWith("customer.subscription.") || event.account) {
    return new Response("ignored", { status: 200 });
  }

  const sub = event.data.object as Stripe.Subscription;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  // Newer API versions moved current_period_end onto the subscription item.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
  const toIso = (s?: number | null) => (s ? new Date(s * 1000).toISOString() : null);

  const { data: existing } = await admin
    .from("tenant_billing")
    .select("tenant_id, past_due_since, trial_ends_at")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!existing) {
    console.error("[stripe-webhook] no tenant for customer", customerId);
    return new Response("unknown customer", { status: 200 }); // don't make Stripe retry forever
  }

  const inGrace = status === "past_due" || status === "unpaid";
  const { error } = await admin
    .from("tenant_billing")
    .update({
      status,
      plan: PLAN_BY_PRICE[item?.price?.id ?? ""] ?? null,
      stripe_subscription_id: sub.id,
      current_period_end: toIso(periodEnd),
      trial_ends_at: toIso(sub.trial_end) ?? existing.trial_ends_at,
      past_due_since: inGrace ? existing.past_due_since ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("tenant_id", existing.tenant_id);

  if (error) {
    console.error("[stripe-webhook] update failed", error);
    return new Response("db error", { status: 500 }); // let Stripe retry
  }
  return new Response("ok", { status: 200 });
});
