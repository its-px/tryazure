const authHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
  };
  try {
    const stored = localStorage.getItem("sb-auth-token");
    const token = stored ? JSON.parse(stored)?.access_token : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // ponytail: no token = anon request, RLS will reject if needed
  }
  return headers;
};

// Earliest upcoming slot for a professional, for the "Next: ..." hint on ProfessionalStep cards.
export const getNextAvailableSlot = async (
  professionalCode: string,
  tenantId: string,
  serviceDurationMinutes: number,
): Promise<{ date: string; start_time: string } | null> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const headers = authHeaders();
  try {
    const datesRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_available_dates`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_professional_id: professionalCode,
        p_tenant_id: tenantId,
        p_service_duration_minutes: serviceDurationMinutes > 0 ? serviceDurationMinutes : 30,
      }),
    });
    if (!datesRes.ok) return null;
    const dates = (await datesRes.json()) as { date: string }[];
    const nextDate = dates?.map((d) => d.date).sort()[0];
    if (!nextDate) return null;

    const slotsRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_available_slots`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        p_professional_id: professionalCode,
        p_date: nextDate,
        p_service_duration_minutes: serviceDurationMinutes > 0 ? serviceDurationMinutes : 30,
        p_tenant_id: tenantId,
      }),
    });
    if (!slotsRes.ok) return null;
    const slots = (await slotsRes.json()) as { start_time: string }[];
    if (!slots?.length) return null;
    return { date: nextDate, start_time: slots[0].start_time };
  } catch (err) {
    console.error("[getNextAvailableSlot] Exception:", err);
    return null;
  }
};

export interface ProfessionalOption {
  id: string;
  code: string;
  name: string;
  tenant_id: string;
  photo_url?: string | null;
}

export const fetchProfessionals = async (
  tenantId?: string,
): Promise<ProfessionalOption[]> => {
  if (!tenantId) return [];

  try {
    const storageKey = "sb-auth-token";
    let token: string | null = null;

    try {
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        token = parsed?.access_token ?? null;
      }
    } catch (err) {
      console.error("[fetchProfessionals] Error reading token:", err);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const headers: Record<string, string> = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/professionals?tenant_id=eq.${tenantId}&select=*&order=name`,
      { headers },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[fetchProfessionals] Response not OK:",
        response.status,
        errorText,
      );
      // Real failure (auth/RLS/network) — don't mask it with fake data
      return [];
    }

    const rows = (await response.json()) as Array<Record<string, unknown>>;

    const mapped = rows
      .map((row) => {
        const id = String(row.id ?? "");
        const code = String(row.code ?? row.id ?? "");
        const name = String(row.name ?? row.code ?? row.id ?? "");

        return {
          id,
          code,
          name,
          tenant_id: String(row.tenant_id ?? tenantId),
          photo_url: (row.photo_url as string | null) ?? null,
        } as ProfessionalOption;
      })
      .filter((p) => Boolean(p.code));

    // 200 OK with zero rows means the tenant genuinely has no professionals yet
    return mapped;
  } catch (err) {
    console.error("[fetchProfessionals] Exception:", err);
    return [];
  }
};

export const getProfessionalNameByCode = (
  professionals: ProfessionalOption[],
  code: string | null | undefined,
): string => {
  if (!code) return "Unknown";
  return professionals.find((p) => p.code === code)?.name ?? code;
};
