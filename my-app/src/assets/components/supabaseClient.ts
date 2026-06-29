import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// const debugBreak = () => {
//   if (import.meta.env.MODE === "development") debugger;
// };

// Create singleton supabase client
const getSupabaseClient = () => {
  if (!supabaseInstance) {
    console.log("[SupabaseClient] Creating new client instance...");
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "sb-auth-token",
        flowType: "pkce",
      },
      global: {
        fetch: (url, options) => {
          console.log("[Supabase] Making fetch request to:", url);
          const timeoutId = setTimeout(() => {
            console.error("[Supabase] Fetch taking longer than 10s:", url);
          }, 10000);

          return fetch(url, options)
            .then((response) => {
              clearTimeout(timeoutId);
              console.log(
                "[Supabase] Fetch completed:",
                url,
                "status:",
                response.status,
              );
              return response;
            })
            .catch((err) => {
              clearTimeout(timeoutId);
              console.error("[Supabase] Fetch failed:", url, err);
              throw err;
            });
        },
      },
    });
    console.log("[SupabaseClient] Client created successfully");
    //debugBreak();
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
