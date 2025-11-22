/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabaseClient";

/**
 * Logs SMS activity to console.
 * @param logMessage - The message to log.
 */
const logSMSActivity = (logMessage: string) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] SMS LOG: ${logMessage}`);
};

/**
 * Validates phone number format
 * @param phoneNumber - The phone number to validate
 * @returns true if valid, false otherwise
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  // Basic validation for international phone numbers
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned.length >= 9 && cleaned.length <= 16;
  }

  return cleaned.length >= 8 && cleaned.length <= 15;
};

/**
 * Formats phone number consistently
 * @param phoneNumber - The phone number to format
 * @returns formatted phone number
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure it starts with + for international format
  if (!cleaned.startsWith("+")) {
    cleaned = "+" + cleaned;
  }

  return cleaned;
};

/**
 * Sends an SMS using Supabase Edge Function (which calls Gateway API)
 * @param recipient - The recipient's phone number
 * @param message - The message to send (optional if using template)
 * @param options - SMS options including template and Gateway API settings
 */
export const sendSMS = async (
  recipient: string,
  message?: string,
  options?: {
    templateType?:
      | "booking_confirmation"
      | "reminder"
      | "cancellation"
      | "verification";
    templateData?: Record<string, any>;
    sender?: string;
    priority?: "BULK" | "NORMAL" | "URGENT" | "VERY_URGENT";
    userref?: string;
    sendtime?: number; // Unix timestamp for scheduled sending
  }
) => {
  try {
    if (!validatePhoneNumber(recipient)) {
      throw new Error(`Invalid phone number format: ${recipient}`);
    }

    logSMSActivity(
      `Attempting to send SMS to ${recipient} ${
        options?.templateType
          ? `using template: ${options.templateType}`
          : `with message: "${message}"`
      }`
    );

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("send-sms", {
      body: {
        phoneNumber: recipient,
        message,
        templateType: options?.templateType,
        templateData: options?.templateData,
        options: {
          sender: options?.sender,
          priority: options?.priority || "NORMAL",
          userref: options?.userref,
          sendtime: options?.sendtime,
        },
      },
    });

    if (error) {
      throw new Error(`Supabase function error: ${error.message}`);
    }

    if (!data.success) {
      throw new Error(data.error || "SMS sending failed");
    }

    logSMSActivity(
      `SMS sent successfully to ${recipient}. Message ID: ${data.messageId}, Cost: ${data.cost} ${data.currency}`
    );

    console.log("SMS sent successfully:", {
      messageId: data.messageId,
      recipient: data.recipient,
      cost: data.cost,
      currency: data.currency,
    });

    return {
      success: true,
      messageId: data.messageId,
      cost: data.cost,
      currency: data.currency,
      recipient: data.recipient,
      originalRecipient: recipient,
    };
  } catch (error) {
    const errorMessage = `Failed to send SMS to ${recipient}. ${
      (error as Error).message
    }`;

    logSMSActivity(errorMessage);
    console.error("SMS Error Details:", {
      recipient,
      error: (error as Error).message,
    });

    throw new Error(errorMessage);
  }
};

/**
 * Sends SMS using predefined templates
 */
export const sendTemplatedSMS = async (
  recipient: string,
  templateType:
    | "booking_confirmation"
    | "reminder"
    | "cancellation"
    | "verification",
  templateData: Record<string, any>,
  options?: {
    sender?: string;
    priority?: "BULK" | "NORMAL" | "URGENT" | "VERY_URGENT";
    userref?: string;
  }
) => {
  return sendSMS(recipient, undefined, {
    templateType,
    templateData,
    ...options,
  });
};
