// We'll dynamically import the Supabase client at runtime so local TypeScript
// type-checking doesn't require the package to be installed. In the Supabase
// Functions (Deno) environment the URL import will succeed.

// In local TypeScript checks the `Deno` global may be unknown; declare it
// so the file type-checks locally while still running in Supabase (Deno).
declare const Deno: any;

const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing env vars" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Dynamically import createClient. Try local package first, then fallback to CDN for Deno runtime.
    let createClient: any;
    try {
      // prefer installed package (node-style) if present
      // this will fail in Deno if the package isn't available locally
      // @ts-ignore - dynamic import, may not be resolvable in local TS environment
      createClient = (await import("@supabase/supabase-js")).createClient;
    } catch (_err) {
      // fallback to CDN (works in Deno)
      // @ts-ignore - dynamic import from CDN for Deno runtime
      createClient = (await import("https://esm.sh/@supabase/supabase-js@2"))
        .createClient;
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => null);
    const { userId, phone } = body || {};

    if (!userId || !phone) {
      return new Response(
        JSON.stringify({ error: "userId and phone are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`Syncing phone for user ${userId}: ${phone}`);

    // Use Admin API to update the phone field
    const result = await supabaseAdmin.auth.admin
      .updateUserById(userId, { phone: phone, phone_confirm: true })
      .catch((e: unknown) => ({ data: null, error: e } as any));

    const { data, error } = result as { data: any; error: unknown };

    if (error) {
      console.error("Error updating user phone:", error);
      return new Response(JSON.stringify({ error: errorMessage(error) }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("Phone synced successfully:", data);

    return new Response(
      JSON.stringify({ success: true, user: (data as any)?.user || data }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: errorMessage(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
