# Gateway API SMS Integration Setup Guide

This guide explains how to properly configure Gateway API SMS service according to their REST API documentation.

## 📋 Prerequisites

1. **Gateway API Account**: Sign up at [gatewayapi.com](https://gatewayapi.com/sign-up/)
2. **API Token**: Create an API token in your Gateway API dashboard
3. **Environment Variables**: Set up your API credentials

## 🔧 Environment Setup

Add the following environment variable to your `.env` file:

```env
# Gateway API Configuration
REACT_APP_GATEWAY_API_TOKEN=your_api_token_here
```

**Important Notes:**

- Only the API token is required (not separate key/secret)
- Gateway API uses Basic Authentication with the token
- The token acts as the username in Basic Auth (password can be empty)

## 🏗️ API Configuration Details

### Authentication Methods (According to Gateway API Docs)

Gateway API supports multiple authentication methods:

1. **Basic Authentication** (Recommended - Used in our implementation)

   ```
   Authorization: Basic base64(token:)
   ```

2. **Query Parameter**

   ```
   GET /rest/mtsms?token=your_token&message=Hello&recipients.0.msisdn=4512345678
   ```

3. **Bearer Token**
   ```
   Authorization: Bearer your_token
   ```

### API Endpoints

- **Production**: `https://gatewayapi.com/rest/mtsms`
- **EU Platform**: `https://gatewayapi.eu/rest/mtsms` (if using EU setup)

## 📱 Phone Number Format

Gateway API accepts phone numbers in these formats:

- `+4512345678` (International with +)
- `004512345678` (International with 00)
- `4512345678` (Direct number)

The API expects MSISDN format as integer or string.

## 🚀 Usage Examples

### Basic SMS Sending

```typescript
import { sendSMS } from "./assets/components/sendSMS";

// Simple SMS
try {
  const result = await sendSMS("+4512345678", "Hello World!");
  console.log("Message ID:", result.messageId);
  console.log("Cost:", result.cost, result.currency);
} catch (error) {
  console.error("SMS failed:", error.message);
}
```

### Advanced SMS with Options

```typescript
// SMS with advanced options
const result = await sendSMS(
  "+4512345678",
  "Your appointment is confirmed for tomorrow at 2 PM",
  {
    sender: "YourApp", // Up to 11 alphanumeric chars or 15 digits
    class: "standard", // 'standard', 'premium', or 'secret'
    priority: "URGENT", // 'BULK', 'NORMAL', 'URGENT', 'VERY_URGENT'
    encoding: "UTF8", // 'UTF8' or 'UCS2' for unicode
    userref: "booking_123", // Your reference ID
    callback_url: "https://your-app.com/sms-status", // Webhook for status
    validity_period: 3600, // Expires in 1 hour (min 60 seconds)
  }
);
```

### Scheduled SMS

```typescript
// Send SMS at specific time (Unix timestamp)
const sendTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

const result = await sendSMS(
  "+4512345678",
  "Reminder: Your appointment is in 1 hour",
  {
    sendtime: sendTime,
    sender: "Reminder",
  }
);
```

## 📊 Response Format

Successful response includes:

```typescript
{
  success: true,
  messageId: 421332671,        // Gateway API message ID
  cost: 0.15,                  // Cost of the SMS
  currency: 'DKK',            // Currency code
  recipient: 4512345678,       // Formatted recipient number
  originalRecipient: '+45 12 34 56 78' // Original input
}
```

## 🔔 Webhooks (Optional)

Set up webhooks to receive delivery status updates:

1. Configure webhook URL in Gateway API dashboard
2. Or use `callback_url` parameter per SMS
3. Gateway API will POST status updates to your endpoint

### Webhook Payload Example

```json
{
  "id": 421332671,
  "msisdn": 4512345678,
  "time": 1450000000,
  "status": "DELIVERED",
  "userref": "booking_123"
}
```

## 🚨 Error Handling

Common error responses:

- **400 Bad Request**: Invalid arguments
- **401 Unauthorized**: Invalid API token
- **403 Forbidden**: Unauthorized IP or insufficient permissions
- **422 Unprocessable Entity**: Invalid JSON
- **500 Internal Server Error**: Server exception

## 💰 Rate Limits & Connection Limits

- **Connection Limit**: Max 40 concurrent connections per IP
- **Bulk Sending**: Up to 10,000 recipients per request
- **Message Limits**: Max 1,000 SMS messages per request

## 🔒 Security Best Practices

1. **Store API token securely** in environment variables
2. **Use HTTPS** for webhook endpoints
3. **Validate webhook signatures** if using JWT authentication
4. **Implement proper error logging** without exposing tokens
5. **Use IP whitelisting** in Gateway API dashboard if possible

## 🌍 Regional Considerations

- **Default**: Use `gatewayapi.com`
- **EU Setup**: Use `gatewayapi.eu` for European compliance
- **Webhook IPs**:
  - Global: `35.241.147.191`, `35.233.1.105`
  - EU: `49.12.113.232`, `78.47.225.149`

## 📞 Support

- **Documentation**: [gatewayapi.com/docs](https://gatewayapi.com/docs/)
- **Dashboard**: [gatewayapi.com/login](https://gatewayapi.com/login/)
- **Support**: Use live chat in their dashboard

## 🧪 Testing

Test your setup with the webhook tester in the Gateway API dashboard before going live.
