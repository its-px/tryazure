/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SMS Logging Utility
 * Provides standardized logging for SMS operations across the application
 */

export interface SMSLogEntry {
  timestamp: string;
  type:
    | "BOOKING_CONFIRMATION"
    | "APPOINTMENT_REMINDER"
    | "CANCELLATION"
    | "VERIFICATION"
    | "CUSTOM"
    | "TEST";
  phoneNumber: string; // Masked for privacy
  bookingId?: string;
  messageId?: string;
  status: "INITIATED" | "SUCCESS" | "FAILED" | "DELIVERED" | "PENDING";
  cost?: number;
  currency?: string;
  error?: string;
  details?: Record<string, any>;
}

export class SMSLogger {
  private static logs: SMSLogEntry[] = [];

  /**
   * Log SMS operation with standardized format
   */
  static log(entry: Omit<SMSLogEntry, "timestamp">) {
    const logEntry: SMSLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      phoneNumber: this.maskPhoneNumber(entry.phoneNumber),
    };

    this.logs.push(logEntry);

    // Console output with emojis for better visibility
    const emoji = this.getStatusEmoji(entry.status);
    const logLevel =
      entry.status === "FAILED"
        ? "error"
        : entry.status === "SUCCESS" || entry.status === "DELIVERED"
        ? "info"
        : "log";

    console[logLevel](`${emoji} SMS ${entry.type}:`, {
      status: entry.status,
      recipient: logEntry.phoneNumber,
      bookingId: entry.bookingId,
      messageId: entry.messageId,
      cost: entry.cost ? `${entry.cost} ${entry.currency}` : undefined,
      error: entry.error,
      timestamp: logEntry.timestamp,
    });

    // Store in localStorage for admin review (last 100 entries)
    this.persistLogs();
  }

  /**
   * Log booking confirmation SMS initiation
   */
  static logBookingConfirmationStart(
    phoneNumber: string,
    bookingId: string,
    details: Record<string, any>
  ) {
    this.log({
      type: "BOOKING_CONFIRMATION",
      phoneNumber,
      bookingId,
      status: "INITIATED",
      details,
    });
  }

  /**
   * Log booking confirmation SMS success
   */
  static logBookingConfirmationSuccess(
    phoneNumber: string,
    bookingId: string,
    messageId: string,
    cost?: number,
    currency?: string
  ) {
    this.log({
      type: "BOOKING_CONFIRMATION",
      phoneNumber,
      bookingId,
      messageId,
      status: "SUCCESS",
      cost,
      currency,
    });
  }

  /**
   * Log booking confirmation SMS failure
   */
  static logBookingConfirmationFailure(
    phoneNumber: string,
    bookingId: string,
    error: string
  ) {
    this.log({
      type: "BOOKING_CONFIRMATION",
      phoneNumber,
      bookingId,
      status: "FAILED",
      error,
    });
  }

  /**
   * Log SMS delivery status update
   */
  static logDeliveryUpdate(
    phoneNumber: string,
    messageId: string,
    status: "DELIVERED" | "FAILED",
    error?: string
  ) {
    this.log({
      type: "CUSTOM", // Generic type for delivery updates
      phoneNumber,
      messageId,
      status,
      error,
    });
  }

  /**
   * Get recent SMS logs
   */
  static getRecentLogs(limit: number = 50): SMSLogEntry[] {
    return this.logs.slice(-limit).reverse();
  }

  /**
   * Get logs by type
   */
  static getLogsByType(type: SMSLogEntry["type"]): SMSLogEntry[] {
    return this.logs.filter((log) => log.type === type);
  }

  /**
   * Get logs by booking ID
   */
  static getLogsByBookingId(bookingId: string): SMSLogEntry[] {
    return this.logs.filter((log) => log.bookingId === bookingId);
  }

  /**
   * Get SMS statistics
   */
  static getStatistics() {
    const totalSent = this.logs.length;
    const successful = this.logs.filter(
      (log) => log.status === "SUCCESS" || log.status === "DELIVERED"
    ).length;
    const failed = this.logs.filter((log) => log.status === "FAILED").length;
    const pending = this.logs.filter(
      (log) => log.status === "PENDING" || log.status === "INITIATED"
    ).length;

    const totalCost = this.logs
      .filter((log) => log.cost)
      .reduce((sum, log) => sum + (log.cost || 0), 0);

    const costByCurrency = this.logs
      .filter((log) => log.cost && log.currency)
      .reduce((acc, log) => {
        const currency = log.currency!;
        acc[currency] = (acc[currency] || 0) + (log.cost || 0);
        return acc;
      }, {} as Record<string, number>);

    return {
      totalSent,
      successful,
      failed,
      pending,
      successRate:
        totalSent > 0 ? ((successful / totalSent) * 100).toFixed(1) : "0",
      totalCost,
      costByCurrency,
    };
  }

  /**
   * Clear old logs (keep only recent ones)
   */
  static clearOldLogs(keepRecent: number = 1000) {
    if (this.logs.length > keepRecent) {
      this.logs = this.logs.slice(-keepRecent);
      this.persistLogs();
    }
  }

  /**
   * Export logs for admin review
   */
  static exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Mask phone number for privacy (show first 3 and last 4 digits)
   */
  private static maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length <= 7) return phoneNumber;
    const start = phoneNumber.substring(0, 3);
    const end = phoneNumber.substring(phoneNumber.length - 4);
    const middle = "*".repeat(phoneNumber.length - 7);
    return `${start}${middle}${end}`;
  }

  /**
   * Get emoji for status
   */
  private static getStatusEmoji(status: SMSLogEntry["status"]): string {
    switch (status) {
      case "INITIATED":
        return "🚀";
      case "SUCCESS":
        return "✅";
      case "DELIVERED":
        return "📨";
      case "FAILED":
        return "❌";
      case "PENDING":
        return "⏳";
      default:
        return "📱";
    }
  }

  /**
   * Persist logs to localStorage
   */
  private static persistLogs() {
    try {
      const recentLogs = this.logs.slice(-100); // Keep only last 100
      localStorage.setItem("smsLogs", JSON.stringify(recentLogs));
    } catch (error) {
      console.warn("Failed to persist SMS logs:", error);
    }
  }

  /**
   * Load persisted logs from localStorage
   */
  static loadPersistedLogs() {
    try {
      const stored = localStorage.getItem("smsLogs");
      if (stored) {
        const parsedLogs = JSON.parse(stored);
        this.logs = Array.isArray(parsedLogs) ? parsedLogs : [];
      }
    } catch (error) {
      console.warn("Failed to load persisted SMS logs:", error);
      this.logs = [];
    }
  }
}

// Auto-load persisted logs when module is imported
SMSLogger.loadPersistedLogs();
