// Test version with NO external dependencies or API calls
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
    console.log("Function started");

    if (method !== "POST") {
      throw new Error("Method not allowed");
    }

    const body = await req.json();
    console.log("Got body:", JSON.stringify(body));

    const phoneNumber = body.phoneNumber;
    console.log("Phone number:", phoneNumber);

    // Just format phone - NO API call
    let formattedPhone = phoneNumber.replace(/\D/g, "");
    if (!formattedPhone.startsWith("30")) {
      formattedPhone = "30" + formattedPhone;
    }

    console.log("Formatted:", formattedPhone);
    console.log("As integer:", parseInt(formattedPhone));

    return new Response(
      JSON.stringify({
        success: true,
        original: phoneNumber,
        formatted: formattedPhone,
        asNumber: parseInt(formattedPhone),
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
