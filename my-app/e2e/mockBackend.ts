import type { Page, Route } from "@playwright/test";

// Fake Supabase for the browser tests. Every request to the Supabase host is
// answered here; anything unknown fails the test instead of reaching prod.

export const TENANT = {
  id: "11111111-1111-1111-1111-111111111111",
  slug: "e2e-barber",
  name: "E2E Barber",
  domain: null,
  config: { businessInfo: { phone: "2100000000", address: "Test St 1, Athens" } },
};

export const SERVICES = [
  { id: "svc-cut", name: "Κούρεμα", name_en: "Haircut", description: "", duration_minutes: 30, price: 15, tenant_id: TENANT.id },
  { id: "svc-beard", name: "Γένια", name_en: "Beard trim", description: "", duration_minutes: 15, price: 8, tenant_id: TENANT.id },
];

export const PROFESSIONALS = [
  { id: "pro-1", name: "Giannis", code: "prof1", tenant_id: TENANT.id, photo_url: null },
  { id: "pro-2", name: "Maria", code: "prof2", tenant_id: TENANT.id, photo_url: null },
];

export const USER = { id: "22222222-2222-2222-2222-222222222222", email: "client@example.com" };

const SLOTS = [
  { start_time: "10:00:00", end_time: "10:30:00" },
  { start_time: "11:00:00", end_time: "11:30:00" },
];

/** Next 14 days as YYYY-MM-DD (local time, like the date picker). */
function upcomingDates() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

export type Backend = {
  /** Bodies POSTed to /rest/v1/bookings. */
  bookings: Record<string, unknown>[];
  /** Existing bookings returned by the conflict check. */
  existingBookings: { id: string; start_time: string; end_time: string }[];
  unexpected: string[];
};

export async function mockBackend(page: Page, opts: { loggedIn?: boolean } = {}): Promise<Backend> {
  const backend: Backend = { bookings: [], existingBookings: [], unexpected: [] };

  if (opts.loggedIn) {
    // supabase-js reads its session from this key (storageKey in supabaseClient.ts).
    await page.addInitScript((user) => {
      const now = Math.floor(Date.now() / 1000);
      localStorage.setItem(
        "sb-auth-token",
        JSON.stringify({
          access_token: "e2e-token",
          refresh_token: "e2e-refresh",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: now + 3600,
          user: { ...user, aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {} },
        }),
      );
    }, USER);
  }
  // A cookie choice is already stored, so the banner doesn't cover the buttons.
  await page.addInitScript(() =>
    localStorage.setItem("cookieConsent", JSON.stringify({ analytics: false, chat: false, ts: "", v: 1 })),
  );

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await page.route(/https:\/\/[a-z0-9]+\.supabase\.co\//, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    // .single()/.maybeSingle() ask for one object instead of an array.
    const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const rows = (r: unknown[]) => json(route, single ? (r[0] ?? null) : r);

    if (method === "OPTIONS") return route.fulfill({ status: 204 });

    // --- auth ---
    if (path.startsWith("/auth/v1/user")) return json(route, { ...USER, aud: "authenticated" });
    if (path.startsWith("/auth/v1/logout")) return route.fulfill({ status: 204 });
    if (path.startsWith("/auth/v1/")) return json(route, {});

    // --- RPCs ---
    const rpc = path.match(/^\/rest\/v1\/rpc\/(\w+)/)?.[1];
    if (rpc === "get_tenant_by_slug" || rpc === "get_tenant_by_domain") return json(route, [TENANT]);
    if (rpc === "set_current_tenant") return route.fulfill({ status: 204 });
    if (rpc === "get_current_tenant_id") return json(route, TENANT.id);
    if (rpc === "tenant_accepts_card") return json(route, false);
    if (rpc === "get_available_dates") return json(route, upcomingDates().map((date) => ({ date })));
    if (rpc === "get_available_slots") return json(route, SLOTS);

    // --- tables ---
    const table = path.match(/^\/rest\/v1\/(\w+)/)?.[1];
    if (method === "GET") {
      if (table === "services") return rows(SERVICES);
      if (table === "professionals") return rows(PROFESSIONALS);
      if (table === "products") return rows([]);
      if (table === "availability") return rows(upcomingDates().map((date) => ({ date })));
      if (table === "bookings") return rows(backend.existingBookings);
      if (table === "profiles")
        return rows([{ id: USER.id, role: "user", full_name: "Eleni Test", phone: "6900000000", email: USER.email, tenant_id: TENANT.id }]);
      if (table === "tenant_billing") return rows([]);
    }
    if (method === "POST" && table === "bookings") {
      const body = req.postDataJSON();
      backend.bookings.push(body);
      return json(route, [{ ...body, id: "booking-1", status: "pending", sms_action_token: "tok" }], 201);
    }
    if (table === "profiles" || table === "booking_products") return json(route, [], 201);

    // --- edge functions (emails, SMS): accept and do nothing ---
    if (path.startsWith("/functions/v1/")) return json(route, { success: true });
    // --- storage (logos/photos) ---
    if (path.startsWith("/storage/v1/")) return route.fulfill({ status: 404 });

    backend.unexpected.push(`${method} ${path}${url.search}`);
    return json(route, { message: "not mocked" }, 500);
  });

  // Realtime websocket: keep it closed so nothing leaks to the real project.
  await page.routeWebSocket(/supabase\.co/, (ws) => ws.close());

  return backend;
}
