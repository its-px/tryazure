import type { ProfessionalOption } from "./professionalsService";

// Base booking URL for a tenant: custom domain if set, else ?tenant=slug.
export function tenantBaseUrl(tenant: { slug: string }, domain: string | null, origin: string): string {
  return domain ? `https://${domain}/` : `${origin}/?tenant=${encodeURIComponent(tenant.slug)}`;
}

// ?pro=<professionalId> link that preselects a professional and skips that step.
export function buildProfessionalLink(baseUrl: string, professionalId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set("pro", professionalId);
  return url.toString();
}

// Resolve ?pro= against the tenant's loaded professionals. Anything unknown
// (bad id, other tenant, inactive/deleted) returns null -> normal wizard.
export function findLinkedProfessional(
  param: string | null | undefined,
  professionals: ProfessionalOption[],
  tenantId?: string,
): ProfessionalOption | null {
  if (!param) return null;
  return (
    professionals.find((p) => p.id === param && (!tenantId || p.tenant_id === tenantId)) ?? null
  );
}
