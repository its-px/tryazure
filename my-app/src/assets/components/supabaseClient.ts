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

    // Handle auth state changes to track sessions
    // Note: Removed problematic callbacks that cause "no longer runnable" errors
    supabaseInstance.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        console.log("User signed in:", session.user.id);
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
      }
      // Don't perform async operations in this callback to avoid "no longer runnable" errors
    });
  }
  return supabaseInstance;
};

export const supabase = getSupabaseClient();
