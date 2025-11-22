import React, { useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import BookingSMSService from "./BookingSMSService";

/**
 * Gateway API SMS Testing Component
 * Use this component to test SMS functionality during development
 */
const GatewayAPISMSTester: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("+4512345678");
  const [message, setMessage] = useState("Test message from Gateway API");
  const [messageType, setMessageType] = useState<
    "booking" | "reminder" | "verification" | "custom"
  >("custom");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleSendSMS = async () => {
    if (!phoneNumber || !message) {
      setError("Phone number and message are required");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");

    try {
      let response;

      switch (messageType) {
        case "booking": {
          response = await BookingSMSService.sendBookingConfirmation(
            phoneNumber,
            {
              date: "2024-12-25",
              time: "14:00 - 15:00",
              service: "Test Service",
              professional: "Test Professional",
              location: "your_place",
              bookingId: "TEST_123",
            }
          );
          break;
        }

        case "reminder":
          response = await BookingSMSService.sendAppointmentReminder(
            phoneNumber,
            {
              date: "2024-12-25",
              time: "14:00",
              service: "Test Service",
              hoursUntil: 2,
              bookingId: "TEST_123",
            }
          );
          break;

        case "verification":
          response = await BookingSMSService.sendVerificationCode(
            phoneNumber,
            "123456",
            10
          );
          break;

        case "custom":
        default: {
          // Import sendSMS directly for custom messages
          const { sendSMS } = await import("./sendSMS");
          response = await sendSMS(phoneNumber, message, {
            sender: "TestApp",
            userref: `test_${Date.now()}`,
            priority: "NORMAL",
          });
          break;
        }
      }

      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const validatePhone = () => {
    return BookingSMSService.validatePhoneNumber(phoneNumber);
  };

  const formatPhone = () => {
    try {
      const formatted = BookingSMSService.formatPhoneNumber(phoneNumber);
      setPhoneNumber(formatted);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Gateway API SMS Tester
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SMS Configuration Test
          </Typography>

          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+4512345678"
              helperText={`Valid: ${validatePhone() ? "✅" : "❌"}`}
            />
            <Button onClick={formatPhone} sx={{ mt: 1 }}>
              Format Phone Number
            </Button>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Message Type</InputLabel>
            <Select
              value={messageType}
              label="Message Type"
              onChange={(e) =>
                setMessageType(
                  e.target.value as
                    | "custom"
                    | "booking"
                    | "reminder"
                    | "verification"
                )
              }
            >
              <MenuItem value="custom">Custom Message</MenuItem>
              <MenuItem value="booking">Booking Confirmation</MenuItem>
              <MenuItem value="reminder">Appointment Reminder</MenuItem>
              <MenuItem value="verification">Verification Code</MenuItem>
            </Select>
          </FormControl>

          {messageType === "custom" && (
            <TextField
              fullWidth
              label="Message"
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              sx={{ mb: 2 }}
            />
          )}

          <Button
            variant="contained"
            onClick={handleSendSMS}
            disabled={loading || !validatePhone()}
            fullWidth
          >
            {loading ? "Sending..." : "Send SMS"}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Response
            </Typography>
            <pre
              style={{
                backgroundColor: "#f5f5f5",
                padding: "10px",
                borderRadius: "4px",
                overflow: "auto",
                fontSize: "12px",
              }}
            >
              {result}
            </pre>
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration Check
          </Typography>
          <Typography variant="body2">
            API Token:{" "}
            {process.env.REACT_APP_GATEWAY_API_TOKEN ? "✅ Set" : "❌ Missing"}
          </Typography>
          <Typography variant="body2">
            Gateway URL: https://gatewayapi.com/rest/mtsms
          </Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Next Steps:</strong>
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Test with a real phone number you own</li>
              <li>Set up webhooks in Gateway API dashboard</li>
              <li>Deploy the webhook handler to Supabase Functions</li>
              <li>Configure phone number collection in user profiles</li>
              <li>Add SMS preferences to user settings</li>
            </ol>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GatewayAPISMSTester;
