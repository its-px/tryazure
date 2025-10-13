import { useEffect, useState } from "react";
import { supabase } from "./assets/components/supabaseClient";
//import Auth from "./assets/components/Auth";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";
import {  Box } from "@mui/material";
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from './theme';
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./assets/components/ProtectedRoute";
import PWAInstallPrompt from "./assets/components/PWAInstallPrompt";



import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Session } from "@supabase/supabase-js";


export type Role = "admin" | "user" | "owner";
function App() {
const [session, setSession] = useState<Session | null>(null);
const [role, setRole] = useState<Role | null>(null);
const [loading, setLoading] = useState(true);

//type Role = "admin" | "user" | "owner";
//type AppMode = "public" | "admin";

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
    else setRole(data?.role || null);
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
      .then(({ data }) => setRole(data?.role || null));
    } else setRole(null);
  });

  return () => listener.subscription.unsubscribe();
  }, []);

  const renderAdminControls = () => (
  <Box
    sx={{
    position: 'fixed',
    top: 10,
    right: 10,
    zIndex: 1000,
    display: 'flex',
    gap: 1,
    flexDirection: 'column'
    }}
  >
    {/* {session && (
    <Button 
      variant="outlined"
      size="small"
      onClick={() => supabase.auth.signOut()}
      sx={{ fontSize: '0.75rem', padding: '4px 8px' }}
    >
      Sign Out
    </Button>
    )} */}
  </Box>
  );

  return (
  <ThemeProvider theme={muiTheme}>
    <CssBaseline />
    <LocalizationProvider dateAdapter={AdapterDayjs}>
    {renderAdminControls()}

    <Routes>
      {/* Public route */}
      <Route path="/" element={<UserPanel />} />

      {/* Protected routes */}
      <Route
      path="/admin"
      element={
        <ProtectedRoute
        session={session}
        role={role}
        allowedRoles={["admin"]}
        loading={loading}
        >
        <AdminPanel />
        </ProtectedRoute>
      }
      />

      <Route
      path="/owner"
      element={
        <ProtectedRoute
        session={session}
        role={role}
        allowedRoles={["owner"]}
        loading={loading}
        >
        <OwnerPanel />
        </ProtectedRoute>
      }
      />

      {/* Optional: fallback route */}
      {/* <Route path="*" element={<NotFoundPage />} /> */}
    </Routes>
    <PWAInstallPrompt />
    </LocalizationProvider>
  </ThemeProvider>
  );
}

export default App;
