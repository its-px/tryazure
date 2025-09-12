import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import AdminPanel from "./AdminPanel";
import UserPanel from "./UserPanel";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      if (data.session) {
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.session.user.id)
          .single();

        if (error) console.error("Error fetching profile:", error);
        else setProfile(profileData);
      }
    };

    loadSession();

    // Listen for auth changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Update profile when session changes
      if (session?.user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => setProfile(data));
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {!session ? (
        <Auth />
      ) : profile?.role === "admin" ? (
        <AdminPanel />
      ) : (
        <UserPanel />
      )}
    </LocalizationProvider>
  );
}

export default App;
