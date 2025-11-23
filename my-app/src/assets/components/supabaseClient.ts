import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    storage: localStorage, // Use localStorage for persistence across page reloads
    autoRefreshToken: true, // Automatically refresh the token before expiry
    detectSessionInUrl: true, // Detect auth sessions from URL (for magic links, etc.)
  },
});
