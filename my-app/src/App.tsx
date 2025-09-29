import { useEffect, useState } from "react";
import { supabase } from "./assets/components/supabaseClient";
import Auth from "./assets/components/Auth";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";
import { Button, Box } from "@mui/material";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

type Role = "admin" | "user" | "owner";
type AppMode = "public" | "admin";

function App() {
  const [session, setSession] = useState<any>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [appMode, setAppMode] = useState<AppMode>("public");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);

      if (currentSession?.user) {
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
      setLoading(false);
    };

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      if (session?.user) {
        supabase
          .from("profiles")
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

  const renderAdminControls = () => (
    <Box 
      sx={{ 
        position: 'fixed', 
        top: 20, 
        right: 20, 
        zIndex: 1000,
        display: 'flex',
        gap: 1,
        flexDirection: 'column'
      }}
    >
      <Button 
        variant="outlined" 
        size="small"
        onClick={() => setAppMode(appMode === "public" ? "admin" : "public")}
      >
        {appMode === "public" ? "Admin Mode" : "Public Mode"}
      </Button>
      
      {session && (
        <Button 
          variant="outlined" 
          size="small"
          onClick={() => supabase.auth.signOut()}
        >
          Sign Out
        </Button>
      )}
    </Box>
  );

  const renderContent = () => {
    // If in admin mode, require authentication
    if (appMode === "admin") {
      if (loading) return <div>Loading...</div>;
      
      if (!session) {
        return <Auth />;
      }

      // Show admin/owner panels based on role
      if (role === "admin") {
        return <AdminPanel />;
      } else if (role === "owner") {
        return <OwnerPanel />;
      } else {
        return (
          <Box textAlign="center" mt={5}>
            <h2>Access Denied</h2>
            <p>You don't have permission to access the admin panel.</p>
            <Button onClick={() => setAppMode("public")} variant="contained">
              Go to Public Site
            </Button>
          </Box>
        );
      }
    }

    // Public mode - always show UserPanel (no login required)
    return <UserPanel />;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {renderAdminControls()}
      {renderContent()}
    </LocalizationProvider>
  );
}

export default App;