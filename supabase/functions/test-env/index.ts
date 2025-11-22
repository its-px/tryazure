// Test with env vars
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
    const smsSender = Deno.env.get("SMS_SENDER");

    console.log("Has API key:", !!gatewayApiKey);
    console.log("Sender:", smsSender);

    if (!gatewayApiKey) {
      throw new Error("SMS_API_KEY not configured");
    }

    return new Response(
      JSON.stringify({
        success: true,
        hasKey: !!gatewayApiKey,
        sender: smsSender,
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
        error: String(error),
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
