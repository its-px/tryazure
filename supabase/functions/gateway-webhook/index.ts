import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GatewayAPIWebhookPayload {
  id: number;
  msisdn: number;
  time: number;
  status: "DELIVERED" | "FAILED" | "SENT" | "BUFFERED" | "UNKNOWN";
  error?: string;
  code?: string;
  userref?: string;
  country_code?: string;
  country_prefix?: number;
  mcc?: string;
  mnc?: string;
  charge_status?: "CAPTURED" | "FAILED";
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-gwapi-signature",
      },
    });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse the webhook payload
    const payload: GatewayAPIWebhookPayload = await req.json();
    console.log("Gateway API Webhook received:", payload);

    // Validate required fields
    if (!payload.id || !payload.msisdn || !payload.status) {
      console.error("Invalid webhook payload:", payload);
      return new Response("Invalid payload", { status: 400 });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create or update SMS log entry
    const smsLogData = {
      gateway_message_id: payload.id,
      recipient_phone: payload.msisdn.toString(),
      delivery_status: payload.status,
      delivered_at:
        payload.status === "DELIVERED"
          ? new Date(payload.time * 1000).toISOString()
          : null,
      error_message: payload.error || null,
      error_code: payload.code || null,
      country_code: payload.country_code || null,
      user_reference: payload.userref || null,
      webhook_received_at: new Date().toISOString(),
    };

    // Insert or update SMS log (create table if it doesn't exist)
    const { error: logError } = await supabase
      .from("sms_logs")
      .upsert(smsLogData, {
        onConflict: "gateway_message_id",
        ignoreDuplicates: false,
      });

    if (logError) {
      console.error("Failed to log SMS status:", logError);
      // Continue processing even if logging fails
    }

    // Process booking-related notifications
    if (payload.userref?.startsWith("booking_")) {
      await processBookingNotification(supabase, payload);
    } else if (payload.userref?.startsWith("reminder_")) {
      await processReminderNotification(supabase, payload);
    } else if (payload.userref?.startsWith("verify_")) {
      await processVerificationNotification(supabase, payload);
    }

    // Handle delivery failures
    if (payload.status === "FAILED") {
      await handleDeliveryFailure(supabase, payload);
    }

    console.log(`SMS ${payload.id} status updated: ${payload.status}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});

async function processBookingNotification(
  supabase: any,
  payload: GatewayAPIWebhookPayload
) {
  if (!payload.userref) return;

  const bookingId = payload.userref.replace("booking_", "");

  try {
    // Update booking with SMS notification status
    const { error } = await supabase
      .from("bookings")
      .update({
        sms_notification_status: payload.status,
        sms_notification_updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (error) {
      console.error("Failed to update booking SMS status:", error);
    } else {
      console.log(`Updated booking ${bookingId} SMS status: ${payload.status}`);
    }
  } catch (error) {
    console.error("Error updating booking notification:", error);
  }
}

async function processReminderNotification(
  supabase: any,
  payload: GatewayAPIWebhookPayload
) {
  if (!payload.userref) return;

  const bookingId = payload.userref.replace("reminder_", "");

  try {
    // Log reminder delivery status
    const { error } = await supabase.from("booking_reminders").upsert(
      {
        booking_id: bookingId,
        sms_status: payload.status,
        gateway_message_id: payload.id,
        delivered_at:
          payload.status === "DELIVERED"
            ? new Date(payload.time * 1000).toISOString()
            : null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "booking_id,gateway_message_id",
      }
    );

    if (error) {
      console.error("Failed to update reminder status:", error);
    }
  } catch (error) {
    console.error("Error updating reminder notification:", error);
  }
}

async function processVerificationNotification(
  supabase: any,
  payload: GatewayAPIWebhookPayload
) {
  // Handle verification code delivery status
  console.log(`Verification SMS ${payload.id} status: ${payload.status}`);

  if (payload.status === "FAILED") {
    console.error(`Verification SMS failed for ${payload.msisdn}`);
    // Could implement fallback verification method here
  }
}

async function handleDeliveryFailure(
  supabase: any,
  payload: GatewayAPIWebhookPayload
) {
  console.error(
    `SMS delivery failed: ${payload.error} (Code: ${payload.code})`
  );

  // For important notifications, consider sending email fallback
  if (
    payload.userref?.startsWith("booking_") ||
    payload.userref?.startsWith("reminder_")
  ) {
    try {
      // Get user email for fallback notification
      const bookingId = payload.userref.replace(/^(booking_|reminder_)/, "");

      const { data: booking } = await supabase
        .from("bookings")
        .select(
          `
          *,
          profiles:user_id (email, full_name)
        `
        )
        .eq("id", bookingId)
        .single();

      if (booking?.profiles?.email) {
        console.log(`Sending email fallback to ${booking.profiles.email}`);
        // Implement email fallback here using your email service

        // Example: Call your email edge function
        /*
        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-fallback-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: booking.profiles.email,
            name: booking.profiles.full_name,
            bookingId,
            originalMessage: 'SMS delivery failed, sending email fallback'
          })
        })
        */
      }
    } catch (error) {
      console.error("Failed to send email fallback:", error);
    }
  }
}

/* 
SQL to create the sms_logs table:

CREATE TABLE IF NOT EXISTS sms_logs (
  id BIGSERIAL PRIMARY KEY,
  gateway_message_id BIGINT UNIQUE NOT NULL,
  recipient_phone TEXT NOT NULL,
  delivery_status TEXT NOT NULL,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  error_code TEXT,
  country_code TEXT,
  user_reference TEXT,
  webhook_received_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_gateway_id ON sms_logs(gateway_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_ref ON sms_logs(user_reference);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(delivery_status);

-- Optional: Add to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_notification_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_notification_updated_at TIMESTAMPTZ;

-- Optional: Create reminders table
CREATE TABLE IF NOT EXISTS booking_reminders (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT REFERENCES bookings(id),
  sms_status TEXT,
  gateway_message_id BIGINT,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(booking_id, gateway_message_id)
);
*/
