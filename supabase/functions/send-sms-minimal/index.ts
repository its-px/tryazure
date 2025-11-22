import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
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
    console.log("Function started");

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
    const requestBody = await req.json();
    console.log("Request body:", requestBody);

    const phoneNumber = requestBody.phoneNumber;
    console.log("Phone number:", phoneNumber);

    // Get environment variables
    const gatewayApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");

    console.log("Has API key:", !!gatewayApiKey);
    console.log("Sender:", smsSender);

    if (!gatewayApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing SMS_API_KEY" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Simple message
    const message = "Test SMS from Supabase Edge Function";

    // Format phone number - simple version
    let formattedPhone = phoneNumber.replace(/\D/g, "");
    if (!formattedPhone.startsWith("30")) {
      formattedPhone = "30" + formattedPhone;
    }

    console.log("Formatted phone:", formattedPhone);

    // Prepare Gateway API payload
    const gatewayPayload = {
      sender: smsSender || "BookingApp",
      message: message,
      encoding: "UCS2",
      recipients: [{ msisdn: parseInt(formattedPhone) }],
    };

    console.log("Calling Gateway API...");

    // Call Gateway API
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

    const gatewayResult = await gatewayResponse.json();
    console.log("Gateway API success:", gatewayResult);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        messageId: gatewayResult.ids[0],
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
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
