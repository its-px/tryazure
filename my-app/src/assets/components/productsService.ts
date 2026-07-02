// Retail add-on products a tenant sells alongside bookable services.
// ponytail: mirrors servicesService.ts's fetch pattern for consistency
// instead of introducing a different data-fetching approach.
export interface Product {
  id: string;
  name: string;
  price: number;
  replenish_days: number | null;
  active: boolean;
  tenant_id?: string | null;
}

export const fetchProducts = async (tenantId?: string): Promise<Product[]> => {
  if (!tenantId) return [];
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const url = `${supabaseUrl}/rest/v1/products?select=*&tenant_id=eq.${tenantId}&active=eq.true&order=name`;
    const response = await fetch(url, {
      headers: { apikey: supabaseKey, "Content-Type": "application/json" },
    });

    if (!response.ok) return [];
    return (await response.json()) as Product[];
  } catch {
    return [];
  }
};
