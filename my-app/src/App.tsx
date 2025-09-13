import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

type Role = "admin" | "user" | "owner";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
        // Remove generic type parameter - just use .from()
        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentSession.user.id)
          .single();

        if (error) console.error("Error fetching profile:", error);
        else if (data?.role === "admin" || data?.role === "user" || data?.role === "owner") {
          setRole(data.role);
        } else {
          console.warn("Unknown role:", data?.role);
          setRole(null);
        }
      }
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        supabase
          .from("profiles") // Remove generic type parameter here too
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.role === "admin" || data?.role === "user" || data?.role === "owner") {
              setRole(data.role);
            } else setRole(null);
          });
      } else setRole(null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {!session ? (
        <Auth />
      ) : role === "admin" ? (
        <AdminPanel />
      ) : role === "owner" ? (
        <OwnerPanel />
      ) : (
        <UserPanel />
      )}
    </LocalizationProvider>
  );
}

export default App;