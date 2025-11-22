import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Check environment variables
    const smsApiKey = Deno.env.get("SMS_API_KEY");
    const gatewayApiKey = Deno.env.get("GATEWAY_API_KEY");
    const smsSender = Deno.env.get("SMS_SENDER");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const envCheck = {
      SMS_API_KEY: smsApiKey ? "✅ SET" : "❌ MISSING",
      GATEWAY_API_KEY: gatewayApiKey ? "✅ SET" : "❌ MISSING",
      SMS_SENDER: smsSender ? "✅ SET" : "❌ MISSING",
      SUPABASE_URL: supabaseUrl ? "✅ SET" : "❌ MISSING",
      SUPABASE_SERVICE_ROLE_KEY: supabaseServiceKey ? "✅ SET" : "❌ MISSING",
    };

    console.log("Environment Variables Check:", envCheck);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Debug info for SMS function",
        environment: envCheck,
        timestamp: new Date().toISOString(),
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
    console.error("Debug function error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Debug function error",
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
