export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
  tenant_id?: string | null;
}

export const fetchServices = async (tenantId?: string): Promise<Service[]> => {
  try {
    console.log(
      "[fetchServices] Fetching services via REST API for tenant:",
      tenantId,
    );

    if (!tenantId) {
      console.warn(
        "[fetchServices] Missing tenantId, returning empty list to avoid unscoped query",
      );
      return [];
    }

    // Get token from localStorage directly to avoid auth hang
    const storageKey = "sb-auth-token";
    let token = null;
    try {
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        token = parsed?.access_token;
        console.log("[fetchServices] Token found in storage");
      }
    } catch (err) {
      console.error("[fetchServices] Error reading token:", err);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log("[fetchServices] Making direct fetch request...");
    const headers: Record<string, string> = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Filter: services belonging to this tenant OR shared services (tenant_id IS NULL)
    const url = `${supabaseUrl}/rest/v1/services?select=*&or=(tenant_id.is.null,tenant_id.eq.${tenantId})&order=name`;

    console.log("[fetchServices] Final URL:", url);
    console.log(
      "[fetchServices] Fetching from URL with tenantId filter:",
      tenantId ? `✅ YES (${tenantId})` : "❌ NO",
    );

    const response = await fetch(url, {
      headers,
    });

    console.log("[fetchServices] Response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[fetchServices] Response not OK:",
        response.status,
        errorText,
      );
      return [];
    }

    const data = await response.json();
    console.log("[fetchServices] Services loaded:", data.length);
    return data as Service[];
  } catch (err) {
    console.error("[fetchServices] Exception:", err);
    return [];
  }
};
