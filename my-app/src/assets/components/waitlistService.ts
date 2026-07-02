// ponytail: mirrors slotService.ts's direct-REST pattern instead of pulling in
// the supabase-js client just for one insert.
export const joinWaitlist = async (
  tenantId: string,
  userId: string,
  serviceId: string,
  professionalId: string | null,
  preferredDate: string | null,
): Promise<boolean> => {
  try {
    const storageKey = "sb-auth-token";
    let token = null;
    try {
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        token = parsed?.access_token;
      }
    } catch (err) {
      console.error("[joinWaitlist] Error reading token:", err);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const headers: Record<string, string> = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/waitlist_entries`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        tenant_id: tenantId,
        user_id: userId,
        service_id: serviceId,
        professional_id: professionalId,
        preferred_date: preferredDate,
      }),
    });

    return response.ok;
  } catch (err) {
    console.error("[joinWaitlist] Exception:", err);
    return false;
  }
};
