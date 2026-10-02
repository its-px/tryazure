// Supabase Edge Function: billing
// Owner-only. Returns a Stripe-hosted URL for the tenant's platform subscription:
//   { action: "checkout", plan: "basic" | "pro", returnUrl } -> Stripe Checkout
//   { action: "portal", returnUrl }                         -> Stripe Customer Portal
//   { action: "connect", returnUrl }                        -> Stripe onboarding for the
//        tenant's OWN Stripe account (client card payments go there, not to the platform)
//   { action: "connect_status" }                            -> refresh charges_enabled
//   { action: "prices" }                                    -> live plan prices from Stripe
// Subscription state is written back by stripe-webhook, never by this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
const PRICES: Record<string, string | undefined> = {
  basic: Deno.env.get("STRIPE_PRICE_BASIC"),
  pro: Deno.env.get("STRIPE_PRICE_PRO"),
};

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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userData.user.id)
      .single();
    if (!profile || profile.role !== "owner" || !profile.tenant_id) {
      return json({ error: "Forbidden" }, 403);
    }

    const { action, plan, returnUrl } = await req.json();

    if (action === "prices") {
      const out: Record<string, { amount: number; currency: string }> = {};
      await Promise.all(
        Object.entries(PRICES).map(async ([key, id]) => {
          if (!id) return;
          const p = await stripe.prices.retrieve(id);
          if (p.unit_amount != null) out[key] = { amount: p.unit_amount, currency: p.currency };
        }),
      );
      return json({ prices: out });
    }

    const url = new URL(returnUrl ?? "https://localhost");
    if (url.protocol !== "https:" && url.hostname !== "localhost") {
      return json({ error: "Invalid returnUrl" }, 400);
    }

    const { data: tenant } = await admin
      .from("tenants")
      .select("id, name")
      .eq("id", profile.tenant_id)
      .single();
    const { data: billing } = await admin
      .from("tenant_billing")
      .select("stripe_customer_id, trial_ends_at, stripe_connect_account_id")
      .eq("tenant_id", profile.tenant_id)
      .maybeSingle();

    // ── Stripe Connect (Standard account: tenant is merchant of record, owns
    //    refunds/disputes, money never touches the platform balance) ──
    if (action === "connect" || action === "connect_status") {
      let accountId = billing?.stripe_connect_account_id;
      if (!accountId) {
        if (action === "connect_status") return json({ charges_enabled: false });
        const account = await stripe.accounts.create({
          type: "standard",
          email: userData.user.email,
          business_profile: { name: tenant?.name ?? undefined },
          metadata: { tenant_id: profile.tenant_id },
        });
        accountId = account.id;
        await admin
          .from("tenant_billing")
          .upsert({ tenant_id: profile.tenant_id, stripe_connect_account_id: accountId });
      }

      const account = await stripe.accounts.retrieve(accountId);
      await admin
        .from("tenant_billing")
        .update({ connect_charges_enabled: !!account.charges_enabled })
        .eq("tenant_id", profile.tenant_id);

      if (action === "connect_status" || account.charges_enabled) {
        return json({ charges_enabled: !!account.charges_enabled });
      }

      const done = new URL(url);
      done.searchParams.set("connect", "done");
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: url.toString(),
        return_url: done.toString(),
      });
      return json({ url: link.url });
    }

    let customerId = billing?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: tenant?.name ?? undefined,
        email: userData.user.email,
        metadata: { tenant_id: profile.tenant_id },
      });
      customerId = customer.id;
      await admin
        .from("tenant_billing")
        .upsert({ tenant_id: profile.tenant_id, stripe_customer_id: customerId });
    }

    if (action === "portal") {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: url.toString(),
      });
      return json({ url: session.url });
    }

    if (action === "checkout") {
      const price = PRICES[plan];
      if (!price) return json({ error: "Unknown plan" }, 400);

      // Keep whatever is left of the free trial. Stripe needs trial_end >= 48h out.
      const trialEnd = billing?.trial_ends_at ? Date.parse(billing.trial_ends_at) : 0;
      const keepTrial = trialEnd > Date.now() + 2 * 86_400_000;

      const success = new URL(url);
      success.searchParams.set("billing", "success");
      const cancel = new URL(url);
      cancel.searchParams.set("billing", "cancel");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,
        line_items: [{ price, quantity: 1 }],
        subscription_data: {
          metadata: { tenant_id: profile.tenant_id },
          ...(keepTrial ? { trial_end: Math.floor(trialEnd / 1000) } : {}),
        },
        allow_promotion_codes: true,
        success_url: success.toString(),
        cancel_url: cancel.toString(),
      });
      return json({ url: session.url });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("[billing]", err);
    return json({ error: (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
