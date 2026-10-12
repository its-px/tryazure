// Supabase Edge Function: send-appointment-reminders
// Cron (e.g. every 15-60 min). Reminds customers of upcoming bookings:
// Web Push first; if no push device (or every push failed) falls back to SMS, then email.
// Idempotent via bookings.reminder_sent_at. Lead time: tenants.config.reminderLeadHours (default 24).
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - URL imports are resolved by Deno at runtime in Supabase Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
// @ts-ignore - npm specifier resolved by Deno at runtime
import webpush from "npm:web-push@3.6.7";
// @ts-ignore - relative Deno import
import { sendEmail, tenantBookingUrl, unsubscribePageUrl } from "../_shared/sendEmail.ts";
// @ts-ignore - relative Deno import
import { isReminderDue, leadHours, pickFallback } from "../_shared/reminderLogic.ts";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

serve(async (req: Request) => {
  // Cron / server-to-server only (verify_jwt = false): require the service-role key.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  if ((req.headers.get("Authorization") ?? "") !== `Bearer ${serviceKey}`) return json({ error: "Unauthorized" }, 401);

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const smsKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER") || "px business";

    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const pushEnabled = !!(vapidPublic && vapidPrivate);
    if (pushEnabled) {
      webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:hello@pxbs.site", vapidPublic!, vapidPrivate!);
    }

    // Coarse DB filter (today..+8 days covers the 168h max lead); exact window is checked in isReminderDue.
    const today = new Date().toISOString().slice(0, 10);
    const maxDay = new Date(Date.now() + 8 * 86400_000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from("bookings")
      .select(
        "id, tenant_id, user_id, status, date, start_time, created_at, reminder_sent_at, tenants!inner(name, domain, config)",
      )
      .is("reminder_sent_at", null)
      .in("status", ["confirmed", "pending"])
      .gte("date", today)
      .lte("date", maxDay);
    if (error) return json({ error: error.message }, 500);

    const now = new Date();
    const results: Array<{ booking_id: string; status: string }> = [];
    let sent = 0;

    for (const b of rows || []) {
      const tenant = b.tenants as { name: string; domain: string | null; config: unknown };
      if (!isReminderDue(b, leadHours(tenant.config), now)) continue;

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, phone, full_name, marketing_opt_out, unsubscribe_token")
        .eq("id", b.user_id)
        .single();
      const text = `Reminder: your appointment at ${tenant.name} is on ${b.date} at ${String(b.start_time).slice(0, 5)}.`;
      const url = tenantBookingUrl(tenant);

      // 1) Push
      let pushed = false;
      if (pushEnabled) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", b.user_id)
          .eq("tenant_id", b.tenant_id);
        for (const sub of subs || []) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              JSON.stringify({ title: tenant.name, body: text, url, tag: `reminder-${b.id}` }),
            );
            pushed = true;
          } catch (err) {
            const code = (err as { statusCode?: number }).statusCode;
            if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            else console.error("Push failed:", err);
          }
        }
      }

      // 2) Fallback: SMS (direct gateway call; send-sms-final needs a user JWT), then email.
      let channel: string = pushed
        ? "push"
        : pickFallback({
            hasPush: false,
            optedOut: !!profile?.marketing_opt_out,
            phone: smsKey ? profile?.phone : null,
            email: resendApiKey ? profile?.email : null,
          });
      let ok = pushed;
      if (channel === "sms") {
        let phone = String(profile!.phone).replace(/\D/g, "");
        if (!phone.startsWith("30")) phone = "30" + phone;
        const r = await fetch("https://gatewayapi.com/rest/mtsms", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Token ${smsKey}` },
          body: JSON.stringify({
            sender: smsSender,
            message: text,
            encoding: "UCS2",
            recipients: [{ msisdn: parseInt(phone, 10) }],
            priority: "NORMAL",
          }),
        });
        ok = r.ok;
        if (!ok) {
          console.error("SMS failed:", await r.text());
          channel = profile?.email && resendApiKey ? "email" : "none";
        }
      }
      if (!ok && channel === "email") {
        ok = await sendEmail(resendApiKey!, profile!.email, `Reminder: your appointment at ${tenant.name}`, {
          greetingName: profile!.full_name || "there",
          bodyText: text,
          ctaLabel: "View booking",
          ctaUrl: url,
          unsubscribe: { token: profile!.unsubscribe_token, pageUrl: unsubscribePageUrl(tenant, profile!.unsubscribe_token) },
        });
      }

      if (!ok) {
        results.push({ booking_id: b.id, status: `failed_${channel}` }); // retried next run
        continue;
      }
      await supabase.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", b.id);
      sent++;
      results.push({ booking_id: b.id, status: `sent_${channel}` });
    }

    return json({ success: true, sent, results });
  } catch (err) {
    console.error("Function Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
