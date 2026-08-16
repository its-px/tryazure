// Fixed-window rate limit backed by the rate_limits table
// (migration 20260706_add_rate_limits.sql). Call with a service-role client.

// deno-lint-ignore no-explicit-any
type SupabaseLike = { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }> };

export async function rateLimit(
  supabase: SupabaseLike,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // ponytail: fail open — a limiter outage must not take down booking flows.
    console.error("rate limit check failed:", error);
    return true;
  }
  return data === true;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function tooManyRequests(headers: Record<string, string>): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Too many requests, try again shortly" }),
    { status: 429, headers: { ...headers, "Content-Type": "application/json" } },
  );
}
