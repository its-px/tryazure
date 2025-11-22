#!/bin/bash

# Gateway API SMS Integration Setup Script
# This script helps you set up and test the Gateway API integration

echo "🚀 Gateway API SMS Integration Setup"
echo "====================================="

# Check if environment variables are set
echo "📋 Checking environment configuration..."

if [ -z "$REACT_APP_GATEWAY_API_TOKEN" ]; then
    echo "❌ REACT_APP_GATEWAY_API_TOKEN is not set"
    echo "   Please add it to your .env file"
    exit 1
else
    echo "✅ Gateway API token is configured"
fi

# Check if Supabase is configured
if [ -z "$VITE_SUPABASE_URL" ]; then
    echo "❌ VITE_SUPABASE_URL is not set"
    exit 1
else
    echo "✅ Supabase URL is configured"
fi

echo ""
echo "🔧 Required Setup Steps:"
echo "========================"

echo "1. 📱 Gateway API Dashboard Setup:"
echo "   - Go to https://gatewayapi.com/login/"
echo "   - Navigate to Webhooks section"
echo "   - Create a new webhook pointing to:"
echo "     https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/gateway-webhook"
echo "   - Set authentication token (optional but recommended)"

echo ""
echo "2. 🗄️  Database Setup:"
echo "   Run this SQL in your Supabase SQL editor:"
echo ""
cat << 'EOF'
-- Create SMS logs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_gateway_id ON sms_logs(gateway_message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_ref ON sms_logs(user_reference);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(delivery_status);

-- Add SMS status columns to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_notification_status TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sms_notification_updated_at TIMESTAMPTZ;

-- Create reminders tracking table
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

-- Add phone number to profiles if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN DEFAULT true;
EOF

echo ""
echo "3. 🚀 Deploy Webhook Handler:"
echo "   cd to your project directory and run:"
echo "   supabase functions deploy gateway-webhook"

echo ""
echo "4. 📞 Test SMS Functionality:"
echo "   - Update a user profile to include a phone number"
echo "   - Make a test booking to trigger SMS"
echo "   - Check Supabase logs for any errors"
echo "   - Verify SMS delivery in Gateway API dashboard"

echo ""
echo "5. 🔒 Security Considerations:"
echo "   - Enable IP whitelisting in Gateway API dashboard"
echo "   - Set up webhook authentication tokens"
echo "   - Monitor SMS usage and costs"
echo "   - Implement rate limiting for SMS sends"

echo ""
echo "📚 Documentation Files Created:"
echo "   - GATEWAY_API_SETUP.md (comprehensive setup guide)"
echo "   - sendSMS.ts (updated with proper Gateway API config)"
echo "   - BookingSMSService.ts (high-level SMS service)"
echo "   - GatewayAPIWebhookHandler.ts (webhook processing)"
echo "   - supabase/functions/gateway-webhook/index.ts (webhook function)"

echo ""
echo "🧪 Testing:"
echo "   - Use the GatewayAPISMSTester component for testing"
echo "   - Start with test phone numbers you own"
echo "   - Monitor costs in Gateway API dashboard"
echo "   - Check webhook delivery in Supabase Function logs"

echo ""
echo "✅ Setup Complete!"
echo "   Your Gateway API SMS integration is now configured."
echo "   Follow the steps above to complete the deployment."