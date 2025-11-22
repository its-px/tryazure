# SMS Integration Setup Guide - Gateway API + Supabase

## Overview

This SMS integration uses Gateway API for sending SMS messages through Supabase Edge Functions. All SMS operations are logged to the database and webhook callbacks update delivery status.

## Architecture

```
Client App → Supabase Edge Functions → Gateway API → SMS Delivery
                  ↓ (logs to database)
Database ← Webhook Handler ← Gateway API (delivery status)
```

## Components Deployed

### 1. Edge Functions

- **send-sms**: Main SMS sending function
- **gateway-webhook**: Handles delivery status webhooks from Gateway API
- **send-booking-reminders**: Automated reminder system
- **sms-admin**: Admin dashboard API

### 2. Database Tables

- **sms_logs**: Records all SMS messages with delivery status
- **sms_templates**: Message templates for different SMS types
- **booking_reminders**: Scheduled reminders for appointments

### 3. Client Components

- **sendSMS.ts**: SMS service client
- **BookingSMSService.ts**: High-level booking SMS service
- **SMSAdminDashboard.tsx**: Admin interface for monitoring

## Setup Instructions

### Step 1: Gateway API Configuration

1. **Login to Gateway API Dashboard**: https://gatewayapi.com/app/
2. **Get your credentials**:

   - API Token (from Settings → API Keys)
   - Account balance should be sufficient for SMS sending

3. **Configure Webhook URL**:
   - Go to Settings → Webhooks
   - Set webhook URL to: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/gateway-webhook`
   - Enable webhook for delivery reports

### Step 2: Environment Variables

Add these to your Supabase project secrets:

```bash
# In Supabase Dashboard → Settings → Edge Functions
GATEWAY_API_TOKEN=your_gateway_api_token_here
```

### Step 3: Test the Integration

1. **Use Admin Dashboard**:

   - Navigate to Admin Panel → SMS Administration
   - Send a test SMS to verify everything works
   - Monitor delivery status in the dashboard

2. **Manual Testing via Edge Function**:

```bash
curl -X POST 'https://YOUR_PROJECT_ID.supabase.co/functions/v1/send-sms' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "phoneNumber": "+4512345678",
    "message": "Test message from booking system",
    "messageType": "test"
  }'
```

## SMS Templates

The system includes 4 pre-configured templates:

1. **Booking Confirmation**

   - Sent when a booking is created
   - Variables: {date}, {time}, {service}, {professional}, {location}, {booking_id}

2. **Appointment Reminder**

   - Sent X hours before appointment (configurable)
   - Variables: {date}, {time}, {service}, {hours_until}, {booking_id}

3. **Cancellation Confirmation**

   - Sent when booking is cancelled
   - Variables: {date}, {time}, {booking_id}

4. **Verification Code**
   - For user verification flows
   - Variables: {code}, {expiry_minutes}

## Usage Examples

### Send Booking Confirmation

```typescript
import { BookingSMSService } from "./BookingSMSService";

const smsService = new BookingSMSService();

await smsService.sendBookingConfirmation({
  phoneNumber: "+4512345678",
  bookingId: "123",
  date: "2025-01-15",
  time: "14:30",
  service: "Haircut",
  professional: "John Doe",
  location: "Main Street Salon",
});
```

### Send Custom SMS

```typescript
import { sendSMS } from "./sendSMS";

await sendSMS({
  phoneNumber: "+4512345678",
  message: "Your custom message here",
  messageType: "custom",
  senderName: "YourApp",
});
```

## Monitoring & Admin Features

The SMS Admin Dashboard provides:

- **Statistics**: Total SMS sent, delivery rates, costs
- **Recent Messages**: View recent SMS with delivery status
- **Templates**: Manage SMS templates
- **Testing**: Send test messages
- **Manual Reminders**: Trigger reminder checks

Access via: Admin Panel → SMS Administration tab

## Automated Reminders

The system automatically sends appointment reminders:

1. **Scheduled Check**: Runs every hour (configurable)
2. **Default Timing**: 2 hours before appointment
3. **Manual Trigger**: Available in admin dashboard

## Cost Tracking

All SMS costs are tracked in the database:

- Cost per message logged in `sms_logs` table
- Total costs displayed in admin dashboard
- Grouped by currency (DKK, EUR, etc.)

## Troubleshooting

### Common Issues:

1. **SMS Not Sending**:

   - Check Gateway API token in environment variables
   - Verify account balance in Gateway API dashboard
   - Check error logs in `sms_logs` table

2. **Webhook Not Working**:

   - Verify webhook URL in Gateway API settings
   - Check `gateway-webhook` function logs
   - Ensure webhook URL is publicly accessible

3. **Template Variables Not Replacing**:
   - Check template syntax in `sms_templates` table
   - Verify variable names match exactly (case-sensitive)
   - Test with admin dashboard first

### Debug Queries:

```sql
-- Check recent SMS logs
SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 10;

-- Check failed SMS
SELECT * FROM sms_logs WHERE delivery_status = 'FAILED';

-- View SMS statistics
SELECT
  message_type,
  delivery_status,
  COUNT(*) as count,
  SUM(cost_amount) as total_cost
FROM sms_logs
GROUP BY message_type, delivery_status;
```

## Security Notes

- Gateway API token stored securely in Supabase secrets
- Phone numbers validated before sending
- Rate limiting recommended for production use
- Admin functions require proper authentication

## Pricing Considerations

Gateway API charges per SMS sent:

- Typical cost: ~0.05-0.15 DKK per SMS (Denmark)
- Costs vary by destination country
- Failed messages may still incur charges
- Monitor costs in admin dashboard regularly

## Support

For issues:

1. Check this documentation first
2. Review error logs in admin dashboard
3. Check Gateway API dashboard for account issues
4. Contact Gateway API support for delivery problems
