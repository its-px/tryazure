// Supabase Edge Function: sms-admin
// Backs the SMSAdminDashboard (AdminPanel). Admin/owner only, owner responses scoped
// to their own tenant (sms_logs/sms_templates/bookings all carry tenant_id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("role, tenant_id")
      .eq("id", userData.user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      return json({ error: "Forbidden" }, 403);
    }

    const tenantFilter = profile.role === "admin" ? null : profile.tenant_id;
    const { action, phoneNumber, message } = await req.json();

    if (action === "stats") {
      let query = admin.from("sms_logs").select("delivery_status, cost_amount, cost_currency, created_at");
      if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
      const { data: logs, error } = await query;
      if (error) throw error;

      const today = new Date().toISOString().slice(0, 10);
      const costs: Record<string, number> = {};
      let delivered = 0, failed = 0, todayCount = 0;
      for (const log of logs ?? []) {
        if (log.delivery_status === "DELIVERED") delivered++;
        if (log.delivery_status === "FAILED") failed++;
        if (log.created_at?.slice(0, 10) === today) todayCount++;
        if (log.cost_amount && log.cost_currency) {
          costs[log.cost_currency] = (costs[log.cost_currency] ?? 0) + Number(log.cost_amount);
        }
      }
      return json({ total: logs?.length ?? 0, delivered, failed, today: todayCount, costs });
    }

    if (action === "recent") {
      let query = admin
        .from("sms_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
      const { data, error } = await query;
      if (error) throw error;
      return json(data ?? []);
    }

    if (action === "templates") {
      let query = admin.from("sms_templates").select("*").order("name");
      if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
      const { data, error } = await query;
      if (error) throw error;
      return json(data ?? []);
    }

    if (action === "test") {
      if (!phoneNumber) return json({ success: false, result: { error: "Phone number is required" } }, 400);
      const smsResponse = await admin.functions.invoke("send-sms-final", {
        headers: { Authorization: authHeader },
        body: {
          phoneNumber,
          templateType: message ? undefined : "test",
          templateData: message ? { message } : undefined,
        },
      });
      if (smsResponse.error) {
        return json({ success: false, result: { error: smsResponse.error.message } });
      }
      return json({ success: true, result: smsResponse.data });
    }

    if (action === "reminders") {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      let query = admin
        .from("bookings")
        .select("id, user_id, date, start_time, tenant_id, professional_id")
        .eq("status", "confirmed")
        .eq("date", tomorrow)
        .is("sms_notification_status", null);
      if (tenantFilter) query = query.eq("tenant_id", tenantFilter);
      const { data: dueBookings, error } = await query;
      if (error) throw error;

      let sent = 0;
      for (const booking of dueBookings ?? []) {
        const { data: profileRow } = await admin
          .from("profiles")
          .select("phone")
          .eq("id", booking.user_id)
          .single();
        if (!profileRow?.phone) continue;

        const smsResponse = await admin.functions.invoke("send-sms-final", {
          headers: { Authorization: authHeader },
          body: {
            phoneNumber: profileRow.phone,
            templateType: "reminder",
            templateData: { date: booking.date, time: booking.start_time },
          },
        });
        if (!smsResponse.error) {
          sent++;
          await admin
            .from("bookings")
            .update({ sms_notification_status: "reminder_sent", sms_notification_updated_at: new Date().toISOString() })
            .eq("id", booking.id);
        }
      }
      return json({ success: true, result: { reminders_sent: sent } });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("sms-admin error:", err);
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
