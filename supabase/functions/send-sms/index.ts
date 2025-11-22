// SMS Sending Function for Gateway API
Deno.serve(async (req) => {
  const { method } = req;

  // Handle CORS
  if (method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    console.log("SMS function called");

    if (method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const body = await req.json();
    const { phoneNumber, templateType, templateData } = body;

    console.log("Request:", { phoneNumber, templateType });

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get environment variables
    const gatewayApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER") || "px business";

    console.log("Has API key:", !!gatewayApiKey, "Sender:", smsSender);

    if (!gatewayApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "SMS_API_KEY not configured" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Format phone number for Greek numbers
    let formattedPhone = String(phoneNumber).replace(/\D/g, "");
    if (!formattedPhone.startsWith("30")) {
      formattedPhone = "30" + formattedPhone;
    }

    console.log("Formatted phone:", formattedPhone);

    // Generate message based on template
    let message = "Test message from BookingApp";
    if (templateType === "booking_confirmation" && templateData) {
      message = `✅ Επιβεβαίωση Ραντεβού!

📅 Ημερομηνία: ${templateData.date || "TBD"}
⏰ Ώρα: ${templateData.time || "TBD"}
🔧 Υπηρεσία: ${templateData.service || "N/A"}
👤 Επαγγελματίας: ${templateData.professional || "N/A"}
📍 Τοποθεσία: ${
        templateData.location === "your_place"
          ? "Στο χώρο σας"
          : "Στο κατάστημά μας"
      }
🆔 Κωδικός: ${templateData.bookingId || "N/A"}

Ευχαριστούμε που μας επιλέξατε! Σας περιμένουμε.`;
    }

    // Call Gateway API
    console.log("Calling Gateway API...");
    const gatewayPayload = {
      sender: smsSender,
      message: message,
      encoding: "UCS2",
      recipients: [{ msisdn: parseInt(formattedPhone, 10) }],
      priority: "NORMAL",
    };

    const gatewayResponse = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${gatewayApiKey}`,
      },
      body: JSON.stringify(gatewayPayload),
    });

    console.log("Gateway API status:", gatewayResponse.status);

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error("Gateway API error:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Gateway API error: ${gatewayResponse.status}`,
          details: errorText,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const result = await gatewayResponse.json();
    console.log("Gateway API success:", result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.ids[0],
        cost: result.usage?.total_cost,
        currency: result.usage?.currency,
        recipient: formattedPhone,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("SMS sending error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: String(error),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});

interface SMSRequest {
  phoneNumber: string;
  message?: string;
  templateType?:
    | "booking_confirmation"
    | "reminder"
    | "cancellation"
    | "verification";
  templateData?: Record<string, any>;
  options?: {
    sender?: string;
    priority?: "BULK" | "NORMAL" | "URGENT" | "VERY_URGENT";
    userref?: string;
    sendtime?: number;
  };
}

interface GatewayAPIResponse {
  ids: number[];
  usage: {
    total_cost: number;
    currency: string;
    country_code: string;
  };
}

function formatGreekPhoneNumber(phoneNumber: string): number | null {
  try {
    // Clean phone number - remove any non-digits
    const cleanPhone = phoneNumber.replace(/\D/g, "");

    // Greek phone number formatting
    let formattedPhone: number;

    if (cleanPhone.startsWith("30")) {
      // Already has country code
      formattedPhone = parseInt(cleanPhone);
    } else if (cleanPhone.startsWith("6") && cleanPhone.length === 10) {
      // Greek mobile number without country code (6XXXXXXXXX)
      formattedPhone = parseInt("30" + cleanPhone);
    } else if (cleanPhone.startsWith("69") && cleanPhone.length === 10) {
      // Greek mobile number starting with 69
      formattedPhone = parseInt("30" + cleanPhone);
    } else {
      console.error(`Invalid Greek phone number format: ${phoneNumber}`);
      return null;
    }

    return formattedPhone;
  } catch (error) {
    console.error("Error formatting phone number:", error);
    return null;
  }
}

function formatDateGreek(dateInput: string): string {
  try {
    let date: Date;

    if (dateInput.includes("-")) {
      // YYYY-MM-DD format
      const [year, month, day] = dateInput.split("-");
      return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
    } else if (dateInput.includes("/")) {
      // Already in DD/MM/YYYY format
      return dateInput;
    } else {
      // Try to parse as Date
      date = new Date(dateInput);
    }

    if (date && !isNaN(date.getTime())) {
      return date.toLocaleDateString("el-GR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } else {
      console.error("Invalid date input:", dateInput);
      return "Invalid Date";
    }
  } catch (error) {
    console.error("Error formatting date:", error, "Input:", dateInput);
    return "Invalid Date";
  }
}

function generateTemplateMessage(
  templateType: string,
  templateData: Record<string, any>
): string {
  const formattedDate = formatDateGreek(templateData.date);

  switch (templateType) {
    case "booking_confirmation":
      return `✅ Επιβεβαίωση Ραντεβού!

📅 Ημερομηνία: ${formattedDate}
⏰ Ώρα: ${templateData.time}
🔧 Υπηρεσία: ${templateData.service}
👤 Επαγγελματίας: ${templateData.professional}
📍 Τοποθεσία: ${
        templateData.location === "your_place"
          ? "Στο χώρο σας"
          : "Στο κατάστημά μας"
      }
🆔 Κωδικός: ${templateData.bookingId}

Ευχαριστούμε που μας επιλέξατε! Σας περιμένουμε.`;

    case "reminder":
      return `⏰ Υπενθύμιση: Το ραντεβού σας είναι αύριο!

📅 Ημερομηνία: ${formattedDate}
⏰ Ώρα: ${templateData.time}
🔧 Υπηρεσία: ${templateData.service}
👤 Επαγγελματίας: ${templateData.professional}
🆔 Κωδικός: ${templateData.bookingId}

Σας περιμένουμε!`;

    case "cancellation":
      return `❌ Ακύρωση Ραντεβού

Το ραντεβού σας στις ${formattedDate} στις ${templateData.time} ακυρώθηκε.
🆔 Κωδικός: ${templateData.bookingId}

Για ερωτήσεις, επικοινωνήστε μαζί μας.`;

    case "verification":
      return `Ο κωδικός επαλήθευσής σας είναι: ${templateData.code}

Ο κωδικός λήγει σε 10 λεπτά. Μη τον μοιραστείτε με κανέναν.`;

    default:
      return templateData.message || "Μήνυμα από BookingApp";
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Parse request body
    const requestBody: SMSRequest = await req.json();
    console.log("SMS request received:", {
      phoneNumber: requestBody.phoneNumber,
      templateType: requestBody.templateType,
      hasMessage: !!requestBody.message,
    });

    // Validate required fields
    if (!requestBody.phoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: "Phone number is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Get environment variables
    const gatewayApiKey =
      Deno.env.get("SMS_API_KEY") || Deno.env.get("GATEWAY_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");

    if (!gatewayApiKey) {
      console.error("Gateway API credentials not configured");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service not configured - Missing SMS_API_KEY",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Prepare message content
    let messageContent: string;
    if (requestBody.templateType && requestBody.templateData) {
      messageContent = generateTemplateMessage(
        requestBody.templateType,
        requestBody.templateData
      );
    } else if (requestBody.message) {
      messageContent = requestBody.message;
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Either message or templateType with templateData is required",
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Format phone number for Greek numbers
    const formattedPhone = formatGreekPhoneNumber(requestBody.phoneNumber);
    if (!formattedPhone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid Greek phone number format: ${requestBody.phoneNumber}. Expected format: 6XXXXXXXXX or 306XXXXXXXXX`,
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    console.log(
      `Formatted phone number: ${requestBody.phoneNumber} -> ${formattedPhone}`
    );

    // Prepare Gateway API payload
    const gatewayPayload = {
      sender: requestBody.options?.sender || smsSender || "BookingApp",
      message: messageContent,
      encoding: "UCS2", // For Greek characters support
      recipients: [
        {
          msisdn: formattedPhone,
        },
      ],
      priority: requestBody.options?.priority || "NORMAL",
      userref: requestBody.options?.userref,
      sendtime: requestBody.options?.sendtime,
    };

    console.log("Sending SMS via Gateway API:", {
      recipient: formattedPhone,
      messageLength: messageContent.length,
      priority: gatewayPayload.priority,
      userref: gatewayPayload.userref,
    });

    // Call Gateway API with Token authentication
    const gatewayResponse = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${gatewayApiKey}`,
      },
      body: JSON.stringify(gatewayPayload),
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error("Gateway API error:", {
        status: gatewayResponse.status,
        statusText: gatewayResponse.statusText,
        body: errorText,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: `Gateway API error: ${gatewayResponse.status} ${gatewayResponse.statusText}`,
          details: errorText,
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const gatewayResult: GatewayAPIResponse = await gatewayResponse.json();
    console.log("Gateway API response:", gatewayResult);

    // Initialize Supabase client for logging
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Log SMS sending attempt
        const { error: logError } = await supabase.from("sms_logs").insert({
          gateway_message_id: gatewayResult.ids[0].toString(),
          recipient_phone: formattedPhone.toString(),
          delivery_status: "SENT",
          user_reference: requestBody.options?.userref || null,
          created_at: new Date().toISOString(),
        });

        if (logError) {
          console.error("Failed to log SMS:", logError);
          // Don't fail the entire function if logging fails
        }
      } catch (logError) {
        console.error("Supabase logging error:", logError);
        // Don't fail the entire function if logging fails
      }
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        messageId: gatewayResult.ids[0],
        cost: gatewayResult.usage.total_cost,
        currency: gatewayResult.usage.currency,
        recipient: formattedPhone,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("SMS sending error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : "No stack trace",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
