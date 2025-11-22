# Gateway API SMS Integration Setup Script
# PowerShell version for Windows

Write-Host "🚀 Gateway API SMS Integration Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Check if environment variables are set
Write-Host "📋 Checking environment configuration..." -ForegroundColor Yellow

$envFile = "my-app\.env"
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile
    $hasToken = $envContent | Where-Object { $_ -match "REACT_APP_GATEWAY_API_TOKEN" }
    $hasSupabase = $envContent | Where-Object { $_ -match "VITE_SUPABASE_URL" }
    
    if ($hasToken) {
        Write-Host "✅ Gateway API token is configured" -ForegroundColor Green
    } else {
        Write-Host "❌ REACT_APP_GATEWAY_API_TOKEN is not set in .env file" -ForegroundColor Red
        exit 1
    }
    
    if ($hasSupabase) {
        Write-Host "✅ Supabase URL is configured" -ForegroundColor Green
    } else {
        Write-Host "❌ VITE_SUPABASE_URL is not set in .env file" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ .env file not found in my-app directory" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "🔧 Required Setup Steps:" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan

Write-Host "1. 📱 Gateway API Dashboard Setup:" -ForegroundColor Yellow
Write-Host "   - Go to https://gatewayapi.com/login/" -ForegroundColor White
Write-Host "   - Navigate to Webhooks section" -ForegroundColor White
Write-Host "   - Create a new webhook pointing to:" -ForegroundColor White
Write-Host "     https://YOUR_SUPABASE_PROJECT.supabase.co/functions/v1/gateway-webhook" -ForegroundColor White
Write-Host "   - Set authentication token (optional but recommended)" -ForegroundColor White

Write-Host ""
Write-Host "2. 🗄️  Database Setup:" -ForegroundColor Yellow
Write-Host "   Run this SQL in your Supabase SQL editor:" -ForegroundColor White
Write-Host ""

$sqlScript = @"
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
"@

Write-Host $sqlScript -ForegroundColor Gray

Write-Host ""
Write-Host "3. 🚀 Deploy Webhook Handler:" -ForegroundColor Yellow
Write-Host "   Open terminal in your project directory and run:" -ForegroundColor White
Write-Host "   supabase functions deploy gateway-webhook" -ForegroundColor White

Write-Host ""
Write-Host "4. 📞 Test SMS Functionality:" -ForegroundColor Yellow
Write-Host "   - Update a user profile to include a phone number" -ForegroundColor White
Write-Host "   - Make a test booking to trigger SMS" -ForegroundColor White
Write-Host "   - Check Supabase logs for any errors" -ForegroundColor White
Write-Host "   - Verify SMS delivery in Gateway API dashboard" -ForegroundColor White

Write-Host ""
Write-Host "5. 🔒 Security Considerations:" -ForegroundColor Yellow
Write-Host "   - Enable IP whitelisting in Gateway API dashboard" -ForegroundColor White
Write-Host "   - Set up webhook authentication tokens" -ForegroundColor White
Write-Host "   - Monitor SMS usage and costs" -ForegroundColor White
Write-Host "   - Implement rate limiting for SMS sends" -ForegroundColor White

Write-Host ""
Write-Host "📚 Documentation Files Created:" -ForegroundColor Cyan
Write-Host "   - GATEWAY_API_SETUP.md (comprehensive setup guide)" -ForegroundColor White
Write-Host "   - my-app/src/assets/components/sendSMS.ts (updated with proper Gateway API config)" -ForegroundColor White
Write-Host "   - my-app/src/assets/components/BookingSMSService.ts (high-level SMS service)" -ForegroundColor White
Write-Host "   - my-app/src/assets/components/GatewayAPIWebhookHandler.ts (webhook processing)" -ForegroundColor White
Write-Host "   - supabase/functions/gateway-webhook/index.ts (webhook function)" -ForegroundColor White

Write-Host ""
Write-Host "🧪 Testing:" -ForegroundColor Cyan
Write-Host "   - Use the GatewayAPISMSTester component for testing" -ForegroundColor White
Write-Host "   - Start with test phone numbers you own" -ForegroundColor White
Write-Host "   - Monitor costs in Gateway API dashboard" -ForegroundColor White
Write-Host "   - Check webhook delivery in Supabase Function logs" -ForegroundColor White

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "   Your Gateway API SMS integration is now configured." -ForegroundColor White
Write-Host "   Follow the steps above to complete the deployment." -ForegroundColor White

# Offer to open relevant URLs
Write-Host ""
$openDashboard = Read-Host "Would you like to open Gateway API dashboard? (y/N)"
if ($openDashboard -eq 'y' -or $openDashboard -eq 'Y') {
    Start-Process "https://gatewayapi.com/login/"
}

$openSupabase = Read-Host "Would you like to open Supabase dashboard? (y/N)"
if ($openSupabase -eq 'y' -or $openSupabase -eq 'Y') {
    # Extract Supabase URL from env file
    $supabaseUrl = ($envContent | Where-Object { $_ -match "VITE_SUPABASE_URL" }) -replace "VITE_SUPABASE_URL=", ""
    if ($supabaseUrl) {
        $dashboardUrl = $supabaseUrl.Replace("https://", "https://supabase.com/dashboard/project/").Replace(".supabase.co", "")
        Start-Process $dashboardUrl
    }
}