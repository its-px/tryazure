import { useEffect, useState } from "react";
import { supabase } from "../assets/components/supabaseClient";

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  config: {
    primaryColor?: string;
    senderName?: string;
    logo?: string | null;
    [key: string]: unknown;
  };
}

interface UseTenantResult {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
}

/**
 * Resolves the current tenant from the hostname (or ?tenant= query param
 * as a dev override) and activates RLS isolation for this session.
 *
 * Call this once at the top of your app (App.tsx) before any DB queries.
 */
export function useTenant(): UseTenantResult {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        // Dev override: ?tenant=some-slug lets you switch tenants locally
        const params = new URLSearchParams(window.location.search);
        const slugOverride = params.get("tenant");

        let data: Tenant | null = null;

        if (slugOverride) {
          // Resolve by slug (dev / testing convenience)
          const { data: row, error: err } = await supabase.rpc(
            "get_tenant_by_slug",
            { p_slug: slugOverride },
          );
          if (err) throw err;
          data = row?.[0] ?? null;
        } else {
          // Resolve by current domain (production path)
          const { data: row, error: err } = await supabase.rpc(
            "get_tenant_by_domain",
            { p_domain: window.location.hostname },
          );
          if (err) throw err;
          data = row?.[0] ?? null;
        }

        if (!data) {
          // No tenant matched — fall back to the default tenant
          const { data: fallback, error: fbErr } = await supabase
            .from("tenants")
            .select("id, slug, name, config")
            .eq("slug", "default")
            .single();
          if (fbErr) throw fbErr;
          data = fallback as Tenant;
        }

        if (!cancelled && data) {
          // Activate RLS isolation so all subsequent queries in this session
          // are filtered to this tenant automatically.
          await supabase.rpc("set_current_tenant", { p_tenant_id: data.id });
          setTenant(data);
          console.log("[Tenant] Active tenant:", data.slug, data.id);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[Tenant] Failed to resolve tenant:", err);
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tenant, loading, error };
}
