/**
 * Gateway API Webhook Handler for SMS Status Updates
 *
 * This handler processes delivery status notifications from Gateway API
 * and can be deployed as a Supabase Edge Function or standalone endpoint
 */

interface GatewayAPIWebhookPayload {
  id: number; // SMS message ID
  msisdn: number; // Recipient phone number
  time: number; // Unix timestamp
  status: "DELIVERED" | "FAILED" | "SENT" | "BUFFERED" | "UNKNOWN";
  error?: string; // Optional error description
  code?: string; // Optional error code (hex)
  userref?: string; // Your reference ID
  country_code?: string; // Country code (e.g., "DK")
  country_prefix?: number; // Country prefix (e.g., 45)
  mcc?: string; // Mobile Country Code
  mnc?: string; // Mobile Network Code
  charge_status?: "CAPTURED" | "FAILED"; // For charged SMS only
}

/**
 * Supabase Edge Function to handle Gateway API webhooks
 * Deploy this to Supabase Functions
 */
export const handleGatewayAPIWebhook = async (request: Request) => {
  try {
    // Validate HTTP method
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Parse the webhook payload
    const payload: GatewayAPIWebhookPayload = await request.json();

    console.log("Received Gateway API webhook:", payload);

    // Validate required fields
    if (!payload.id || !payload.msisdn || !payload.status) {
      console.error("Invalid webhook payload:", payload);
      return new Response("Invalid payload", { status: 400 });
    }

    // Process the status update
    await processSMSStatusUpdate(payload);

    // Return 200 OK to acknowledge receipt
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

/**
 * Process SMS status updates and update your database
 */
async function processSMSStatusUpdate(payload: GatewayAPIWebhookPayload) {
  // Import Supabase client (adjust import path as needed)
  // import { createClient } from '@supabase/supabase-js';
  // const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Update SMS log in database
    /*
    const updateData = {
      gateway_message_id: payload.id,
      recipient_phone: payload.msisdn.toString(),
      delivery_status: payload.status,
      delivered_at: payload.status === "DELIVERED" ? new Date(payload.time * 1000) : null,
      error_message: payload.error || null,
      error_code: payload.code || null,
      country_code: payload.country_code || null,
      updated_at: new Date(),
    };
    */

    // Example database update (adjust table/column names as needed)
    /*
    const { error } = await supabase
      .from('sms_logs')
      .update(updateData)
      .eq('gateway_message_id', payload.id);

    if (error) {
      console.error('Database update error:', error);
      return;
    }
    */

    // Handle different status types
    switch (payload.status) {
      case "DELIVERED":
        await handleDeliveredSMS(payload);
        break;

      case "FAILED":
        await handleFailedSMS(payload);
        break;

      case "SENT":
        console.log(`SMS ${payload.id} sent to network`);
        break;

      case "BUFFERED":
        console.log(`SMS ${payload.id} buffered for delivery`);
        break;

      default:
        console.log(`Unknown status ${payload.status} for SMS ${payload.id}`);
    }

    // Handle booking-related updates if userref contains booking ID
    if (payload.userref?.startsWith("booking_")) {
      await updateBookingNotificationStatus(payload);
    }
  } catch (error) {
    console.error("Error processing SMS status:", error);
    throw error;
  }
}

/**
 * Handle successfully delivered SMS
 */
async function handleDeliveredSMS(payload: GatewayAPIWebhookPayload) {
  console.log(`SMS ${payload.id} delivered successfully to ${payload.msisdn}`);

  // You might want to:
  // - Update user notification preferences
  // - Log successful delivery for analytics
  // - Trigger follow-up actions

  if (payload.userref?.startsWith("verify_")) {
    console.log("Verification SMS delivered");
  } else if (payload.userref?.startsWith("booking_")) {
    console.log("Booking confirmation SMS delivered");
  }
}

/**
 * Handle failed SMS delivery
 */
async function handleFailedSMS(payload: GatewayAPIWebhookPayload) {
  console.error(`SMS ${payload.id} failed to deliver to ${payload.msisdn}`);
  console.error(`Error: ${payload.error}, Code: ${payload.code}`);

  // You might want to:
  // - Retry with different gateway
  // - Send email fallback notification
  // - Update user contact preferences
  // - Log failure for investigation

  // Example: Send email fallback for important notifications
  if (
    payload.userref?.startsWith("booking_") ||
    payload.userref?.startsWith("reminder_")
  ) {
    await sendEmailFallback(payload);
  }
}

/**
 * Update booking notification status
 */
async function updateBookingNotificationStatus(
  payload: GatewayAPIWebhookPayload
) {
  if (!payload.userref) return;

  const bookingId = payload.userref.replace(
    /^(booking_|reminder_|cancel_)/,
    ""
  );

  console.log(`Updating notification status for booking ${bookingId}`);

  // Update booking record with notification status
  /*
  const { error } = await supabase
    .from('bookings')
    .update({ 
      sms_notification_status: payload.status,
      sms_notification_updated_at: new Date()
    })
    .eq('id', bookingId);

  if (error) {
    console.error('Failed to update booking notification status:', error);
  }
  */
}

/**
 * Send email fallback when SMS fails
 */
async function sendEmailFallback(payload: GatewayAPIWebhookPayload) {
  console.log(`Sending email fallback for failed SMS ${payload.id}`);

  // Implement email sending logic here
  // You might use Resend, SendGrid, or another email service

  try {
    // Example with Resend (adjust as needed)
    /*
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'notifications@yourapp.com',
        to: 'user@example.com', // Get from database
        subject: 'Important Notification',
        html: 'Your SMS notification failed to deliver. Here\'s the information...'
      }),
    });
    */
  } catch (error) {
    console.error("Email fallback failed:", error);
  }
}

/**
 * Middleware to validate Gateway API webhook signature (if using JWT)
 */
export function validateGatewayAPISignature(request: Request): boolean {
  try {
    const signature = request.headers.get("X-Gwapi-Signature");
    if (!signature) {
      console.error("Missing webhook signature");
      return false;
    }

    // Validate JWT signature (requires jwt library)
    // const jwt = require('jsonwebtoken');
    // const decoded = jwt.verify(signature, secret);
    // return !!decoded;

    return true; // Placeholder - implement JWT verification
  } catch (error) {
    console.error("Signature validation failed:", error);
    return false;
  }
}

/**
 * Example Supabase Edge Function entry point
 * Save this as supabase/functions/gateway-webhook/index.ts
 */
/*
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // Enable CORS for webhook testing
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gwapi-signature',
      },
    });
  }

  return handleGatewayAPIWebhook(req);
});
*/
