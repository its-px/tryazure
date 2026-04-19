export interface ProfessionalOption {
  id: string;
  code: string;
  name: string;
  tenant_id: string;
}

const DEFAULT_PROFESSIONALS = [
  { id: "prof1", code: "prof1", name: "Person 1" },
  { id: "prof2", code: "prof2", name: "Person 2" },
];

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

      return DEFAULT_PROFESSIONALS.map((p) => ({ ...p, tenant_id: tenantId }));
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
        } as ProfessionalOption;
      })
      .filter((p) => Boolean(p.code));

    if (mapped.length === 0) {
      return DEFAULT_PROFESSIONALS.map((p) => ({ ...p, tenant_id: tenantId }));
    }

    return mapped;
  } catch (err) {
    console.error("[fetchProfessionals] Exception:", err);
    return DEFAULT_PROFESSIONALS.map((p) => ({ ...p, tenant_id: tenantId }));
  }
};

export const getProfessionalNameByCode = (
  professionals: ProfessionalOption[],
  code: string | null | undefined,
): string => {
  if (!code) return "Unknown";
  return professionals.find((p) => p.code === code)?.name ?? code;
};
