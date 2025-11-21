/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";

const GATEWAY_API_URL = "https://gatewayapi.com/rest/mtsms";
const API_KEY = process.env.REACT_APP_GATEWAY_API_KEY;
const API_SECRET = process.env.REACT_APP_GATEWAY_API_SECRET;
const API_TOKEN = process.env.REACT_APP_GATEWAY_API_TOKEN;

// Debug environment variables
console.log("🔑 Gateway API Configuration:");
console.log("API_KEY:", API_KEY ? `${API_KEY.substring(0, 5)}...` : "NOT SET");
console.log(
  "API_SECRET:",
  API_SECRET ? `${API_SECRET.substring(0, 5)}...` : "NOT SET"
);
console.log(
  "API_TOKEN:",
  API_TOKEN ? `${API_TOKEN.substring(0, 10)}...` : "NOT SET"
);
console.log("API_URL:", GATEWAY_API_URL);

if (!API_KEY || !API_SECRET || !API_TOKEN) {
  console.error(
    "❌ GatewayAPI credentials are missing. Please check your environment variables."
  );
} else {
  console.log("✅ All GatewayAPI credentials are loaded");
}

/**
 * Logs SMS activity to console.
 * @param logMessage - The message to log.
 */
const logSMSActivity = (logMessage: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SMS LOG: ${logMessage}`);
};

/**
 * Sends an SMS using GatewayAPI.
 * @param recipient - The recipient's phone number (e.g., +4512345678).
 * @param message - The message to send.
 */
export const sendSMS = async (recipient: string, message: string) => {
  try {
    logSMSActivity(
      `Attempting to send SMS to ${recipient} with message: "${message}"`
    );

    const response = await axios.post(
      GATEWAY_API_URL,
      {
        sender: "YourAppName", // Replace with your sender name
        message,
        recipients: [{ msisdn: recipient }],
      },
      {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    logSMSActivity(
      `SMS sent successfully to ${recipient}. Response: ${JSON.stringify(
        response.data
      )}`
    );
    console.log("SMS sent successfully:", response.data);
    return response.data;
  } catch (error) {
    const errorMessage = `Failed to send SMS to ${recipient}. Error: ${
      (error as any)?.response?.data || (error as Error).message
    }`;
    logSMSActivity(errorMessage);
    console.error(errorMessage);
    throw error;
  }
};
