import { useContext } from "react";
import { TenantContext } from "./tenantContextDef";
import type { TenantContextValue } from "./tenantContextDef";

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error("useTenantContext must be used inside <TenantProvider>");
  }
  return ctx;
}
