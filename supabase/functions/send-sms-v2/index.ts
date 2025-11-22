// SMS Function without Supabase client library
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
      throw new Error("Method not allowed");
    }

    const body = await req.json();
    const { phoneNumber, templateType, templateData } = body;

    console.log("Phone:", phoneNumber, "Template:", templateType);

    // Get environment variables
    const gatewayApiKey = Deno.env.get("SMS_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");

    if (!gatewayApiKey) {
      throw new Error("SMS_API_KEY not configured");
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, "");
    if (!formattedPhone.startsWith("30")) {
      formattedPhone = "30" + formattedPhone;
    }

    // Simple message
    const message = `✅ Booking Confirmation!\nDate: ${
      templateData?.date || "TBD"
    }\nTime: ${templateData?.time || "TBD"}`;

    // Call Gateway API
    console.log("Calling Gateway API...");
    const gatewayResponse = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        sender: smsSender || "BookingApp",
        message,
        encoding: "UCS2",
        recipients: [{ msisdn: parseInt(formattedPhone) }],
      }),
    });

    if (!gatewayResponse.ok) {
      const errorText = await gatewayResponse.text();
      console.error("Gateway error:", errorText);
      throw new Error(`Gateway API error: ${gatewayResponse.status}`);
    }

    const result = await gatewayResponse.json();
    console.log("Success!", result);

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.ids[0],
        recipient: formattedPhone,
      }),
      {
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
        error: error.message || String(error),
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
