// Minimal SMS test with Gateway API
Deno.serve(async (req) => {
  const { method } = req;

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
    console.log("Start");

    if (method !== "POST") {
      throw new Error("Method not allowed");
    }

    const body = await req.json();
    console.log("Body OK");

    const gatewayApiKey = Deno.env.get("SMS_API_KEY");
    if (!gatewayApiKey) {
      throw new Error("No API key");
    }

    console.log("Has key, length:", gatewayApiKey.length);
    console.log("First 10 chars:", gatewayApiKey.substring(0, 10));
    console.log(
      "Last 10 chars:",
      gatewayApiKey.substring(gatewayApiKey.length - 10)
    );

    const phoneNumber = "306948809699";

    console.log("About to fetch...");
    const response = await fetch("https://gatewayapi.com/rest/mtsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${gatewayApiKey}`,
      },
      body: JSON.stringify({
        sender: "Test",
        message: "Hello from Supabase",
        recipients: [{ msisdn: 306948809699 }],
      }),
    });

    console.log("Fetch done, status:", response.status);

    const result = await response.json();
    console.log("Result:", result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
