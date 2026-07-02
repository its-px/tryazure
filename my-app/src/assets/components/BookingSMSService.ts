import {
  sendTemplatedSMS,
  validatePhoneNumber,
  formatPhoneNumber,
} from "./sendSMS";
import { SMSLogger } from "./SMSLogger";

/**
 * SMS service for booking-related notifications
 * Uses Supabase Edge Functions with Gateway API integration and database templates
 */
export class BookingSMSService {
  /**
   * Sends booking confirmation SMS using database template
   */
  static async sendBookingConfirmation(
    phoneNumber: string,
    bookingDetails: {
      date: string;
      time: string;
      service: string;
      professional: string;
      location: "your_place" | "our_place";
      bookingId: string;
      actionToken?: string;
      appUrl?: string;
    }
  ) {
    // Log SMS initiation
    SMSLogger.logBookingConfirmationStart(
      phoneNumber,
      bookingDetails.bookingId,
      {
        date: bookingDetails.date,
        time: bookingDetails.time,
        service: bookingDetails.service,
        professional: bookingDetails.professional,
        location: bookingDetails.location,
      }
    );

    const templateData = {
      date: bookingDetails.date,
      time: bookingDetails.time,
      service: bookingDetails.service,
      professional: bookingDetails.professional,
      location:
        bookingDetails.location === "your_place"
          ? "at your location"
          : "at our location",
      booking_id: bookingDetails.bookingId,
      action_token: bookingDetails.actionToken,
      app_url: bookingDetails.appUrl,
    };

    try {
      const result = await sendTemplatedSMS(
        phoneNumber,
        "booking_confirmation",
        templateData,
        {
          userref: `booking_${bookingDetails.bookingId}`,
          priority: "NORMAL",
        }
      );

      // Log success
      SMSLogger.logBookingConfirmationSuccess(
        phoneNumber,
        bookingDetails.bookingId,
        result.messageId,
        result.cost,
        result.currency
      );

      return result;
    } catch (error) {
      // Log failure
      SMSLogger.logBookingConfirmationFailure(
        phoneNumber,
        bookingDetails.bookingId,
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  /**
   * Sends appointment reminder SMS using database template
   */
  static async sendAppointmentReminder(
    phoneNumber: string,
    reminderDetails: {
      date: string;
      time: string;
      service: string;
      hoursUntil: number;
      bookingId: string;
    }
  ) {
    const templateData = {
      date: reminderDetails.date,
      time: reminderDetails.time,
      service: reminderDetails.service,
      hours_until: reminderDetails.hoursUntil,
      booking_id: reminderDetails.bookingId,
    };

    return await sendTemplatedSMS(phoneNumber, "reminder", templateData, {
      userref: `reminder_${reminderDetails.bookingId}`,
      priority: "URGENT",
    });
  }

  /**
   * Sends cancellation confirmation SMS using database template
   */
  static async sendCancellationConfirmation(
    phoneNumber: string,
    cancellationDetails: {
      date: string;
      time: string;
      bookingId: string;
    }
  ) {
    const templateData = {
      date: cancellationDetails.date,
      time: cancellationDetails.time,
      booking_id: cancellationDetails.bookingId,
    };

    return await sendTemplatedSMS(phoneNumber, "cancellation", templateData, {
      userref: `cancel_${cancellationDetails.bookingId}`,
      priority: "NORMAL",
    });
  }

  /**
   * Sends verification code SMS using database template
   */
  static async sendVerificationCode(
    phoneNumber: string,
    verificationCode: string,
    expiryMinutes: number = 10
  ) {
    const templateData = {
      code: verificationCode,
      expiry_minutes: expiryMinutes,
    };

    return await sendTemplatedSMS(phoneNumber, "verification", templateData, {
      userref: `verify_${Date.now()}`,
      priority: "VERY_URGENT",
    });
  }

  /**
   * Utility method to validate phone numbers before sending
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    return validatePhoneNumber(phoneNumber);
  }

  /**
   * Utility method to format phone numbers consistently
   */
  static formatPhoneNumber(phoneNumber: string): string {
    return formatPhoneNumber(phoneNumber);
  }
}

export default BookingSMSService;
