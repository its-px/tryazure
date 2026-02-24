import { createContext } from "react";

// Per-tenant brand colors extracted from config
export interface TenantBrandColors {
  primaryColor: string; // e.g. "#e91e63"
  primaryLight: string;
  primaryDark: string;
  primaryHover: string;
  primaryOverlay: string; // rgba with opacity, used for backgrounds
}

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
  /** Full resolved brand color set (may be tenant-specific or the default green) */
  brandColors: TenantBrandColors;
  /** SMS sender name from config */
  senderName: string | null;
}

// Default brand colors (original green scheme)
export const DEFAULT_BRAND_COLORS: TenantBrandColors = {
  primaryColor: "#2e7d32",
  primaryLight: "#4caf50",
  primaryDark: "#1b5e20",
  primaryHover: "#1b5e20",
  primaryOverlay: "rgba(46, 125, 50, 0.1)",
};

export const TenantContext = createContext<TenantContextValue | null>(null);
