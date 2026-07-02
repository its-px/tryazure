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
