import { createContext } from "react";

// ─── Derived tenant data available everywhere in the app ───────────────────
export interface TenantContextValue {
  tenant: {
    id: string;
    slug: string;
    name: string;
    config: Record<string, unknown>;
  } | null;
  loading: boolean;
  /** Ready-to-use public URL for the tenant logo, falls back to /logo.png */
  logoUrl: string;
  /** Primary brand color from tenant config */
  primaryColor: string | null;
  /** SMS sender name from config */
  senderName: string | null;
}

export const TenantContext = createContext<TenantContextValue | null>(null);
