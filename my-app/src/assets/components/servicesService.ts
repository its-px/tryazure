import { supabase } from "./supabaseClient";

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

export const fetchServices = async (): Promise<Service[]> => {
  try {
    console.log("[fetchServices] Fetching services via REST API...");

    // Get token from localStorage directly to avoid auth hang
    const storageKey = "sb-auth-token";
    let token = null;
    try {
      const storedSession = localStorage.getItem(storageKey);
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        token = parsed?.access_token;
        console.log("[fetchServices] Token found in storage");
      }
    } catch (err) {
      console.error("[fetchServices] Error reading token:", err);
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    console.log("[fetchServices] Making direct fetch request...");
    const headers: Record<string, string> = {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${supabaseUrl}/rest/v1/services?select=*&order=name`,
      {
        headers,
      }
    );

    console.log("[fetchServices] Response status:", response.status);

    if (!response.ok) {
      console.error("[fetchServices] Response not OK:", response.statusText);
      return [];
    }

    const data = await response.json();
    console.log("[fetchServices] Services loaded:", data.length);
    return data as Service[];
  } catch (err) {
    console.error("[fetchServices] Exception:", err);
    return [];
  }
};
