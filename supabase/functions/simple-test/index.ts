// Follow Deno deploy conventions for Supabase Edge Functions
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
    console.log("Function called!");

    if (method !== "POST") {
      throw new Error("Method not allowed");
    }

    const body = await req.json();
    console.log("Body:", body);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test successful",
        received: body,
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
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
