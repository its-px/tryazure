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
    const requestBody = await req.json();
    console.log("Test function - Request received:", requestBody);

    // Check environment variables
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");

    console.log("SMS_API_KEY exists:", !!smsApiKey);
    console.log("SMS_API_KEY length:", smsApiKey?.length || 0);
    console.log("SMS_SENDER:", smsSender);

    if (!smsApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS_API_KEY not found in environment",
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

    // Test Gateway API call
    const testPayload = {
      sender: smsSender || "TestSender",
      message: "Test message: ✅ Greek characters: Γειά σου!",
      encoding: "UCS2",
      recipients: [
        {
          msisdn: 306948809699,
        },
      ],
    };

    console.log("Calling Gateway API with payload:", testPayload);

    const gatewayResponse = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${smsApiKey}`,
      },
      body: JSON.stringify(testPayload),
    });

    const responseText = await gatewayResponse.text();
    console.log("Gateway API status:", gatewayResponse.status);
    console.log("Gateway API response:", responseText);

    if (!gatewayResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Gateway API error: ${gatewayResponse.status}`,
          details: responseText,
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

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test SMS sent successfully",
        gatewayResponse: responseText,
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
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
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
