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
