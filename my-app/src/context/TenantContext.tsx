import { type ReactNode } from "react";
import { useTenant } from "../hooks/useTenant";
import { supabase } from "../assets/components/supabaseClient";
import { TenantContext, DEFAULT_BRAND_COLORS } from "./tenantContextDef";
import type { TenantContextValue } from "./tenantContextDef";

// ─── Derive the logo URL ────────────────────────────────────────────────────
function resolveLogoUrl(tenant: TenantContextValue["tenant"]): string {
  if (!tenant) return "/logo.png";

  // 1. Explicit override stored by admin in config.logoUrl
  if (tenant.config?.logoUrl) {
    return tenant.config.logoUrl as string;
  }

  // 2. Auto-derive from Storage bucket using slug as folder:
  //    bucket: tenant-assets / path: {slug}/logo.png
  const { data } = supabase.storage
    .from("tenant-assets")
    .getPublicUrl(`${tenant.slug}/logo.png`);

  // getPublicUrl always returns a URL, even if the file doesn't exist yet.
  // When no file is uploaded the browser will show a broken image, so we
  // fall back to /logo.png on img's onError in the component.
  return data.publicUrl;
}

// ─── Derive brand colors from tenant config ──────────────────────────────────
function resolveBrandColors(
  tenant: TenantContextValue["tenant"],
): import("./tenantContextDef").TenantBrandColors {
  if (!tenant?.config?.primaryColor) return DEFAULT_BRAND_COLORS;
  const c = tenant.config;
  return {
    primaryColor: c.primaryColor as string,
    primaryLight: (c.primaryLight as string) ?? (c.primaryColor as string),
    primaryDark: (c.primaryDark as string) ?? (c.primaryColor as string),
    primaryHover: (c.primaryHover as string) ?? (c.primaryColor as string),
    primaryOverlay:
      (c.primaryOverlay as string) ?? `${c.primaryColor as string}1a`,
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────
export function TenantProvider({ children }: { children: ReactNode }) {
  const { tenant, loading } = useTenant();

  const value: TenantContextValue = {
    tenant,
    loading,
    logoUrl: resolveLogoUrl(tenant),
    brandColors: resolveBrandColors(tenant),
    senderName: (tenant?.config?.senderName as string) ?? null,
  };

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}
