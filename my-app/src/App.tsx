import { useEffect, useState } from "react";
import { supabase } from "./assets/components/supabaseClient";
//import Auth from "./assets/components/Auth";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";
import { Box } from "@mui/material";
//import ThemeProviderWrapper from "./ThemeProviderWrapper";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./assets/components/ProtectedRoute";
import PWAInstallPrompt from "./assets/components/PWAInstallPrompt";
import CompleteProfileModal from "./assets/components/CompleteProfileModal";
import i18n from "./i18n";
import { I18nextProvider } from "react-i18next";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Session } from "@supabase/supabase-js";

export type Role = "admin" | "user" | "owner";
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  //type Role = "admin" | "user" | "owner";
  //type AppMode = "public" | "admin";

  useEffect(() => {
    const loadSession = async () => {
      // Handle OAuth callback - check for hash fragments
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const error = hashParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        window.history.replaceState(null, "", window.location.pathname);
        setLoading(false);
        return;
      } else if (accessToken) {
        setTimeout(() => {
          window.history.replaceState(null, "", window.location.pathname);
        }, 100);
      }

      // Get session directly without refresh to avoid hanging
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

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

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);

        if (session?.user) {
          // Check if this is an OAuth login by checking for hash fragments
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          if (hashParams.get("access_token")) {
            // OAuth login completed - fetch profile and redirect if needed
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("role, full_name, phone")
              .eq("id", session.user.id)
              .single();

            if (!profileError && profile) {
              setRole(profile.role || null);

              // Check if profile needs to be completed (missing phone or name)
              if (!profile.full_name || !profile.phone) {
                setShowCompleteProfile(true);
              }

              // Redirect based on role only if we just logged in via OAuth
              const redirectPath = location.pathname;
              if (profile.role === "admin" && redirectPath !== "/admin") {
                navigate("/admin");
              } else if (
                profile.role === "owner" &&
                redirectPath !== "/owner"
              ) {
                navigate("/owner");
              }
            } else if (profileError && profileError.code === "PGRST116") {
              // Profile doesn't exist - show complete profile modal for OAuth user
              setShowCompleteProfile(true);
              // Create minimal profile
              const { error: insertError } = await supabase
                .from("profiles")
                .insert([
                  {
                    id: session.user.id,
                    email: session.user.email || "",
                    full_name:
                      session.user.user_metadata?.full_name ||
                      session.user.user_metadata?.name ||
                      "",
                    role: "user",
                  },
                ]);

              if (!insertError) {
                setRole("user");
              }
            }

            // Clean up hash fragments from URL after OAuth processing
            setTimeout(() => {
              if (window.location.hash) {
                window.history.replaceState(
                  null,
                  "",
                  window.location.pathname + window.location.search
                );
              }
            }, 200);
          } else {
            // Regular session check - just fetch role
            supabase
              .from("profiles")
              .select("role")
              .eq("id", session.user.id)
              .single()
              .then(({ data }) => setRole(data?.role || null));
          }
        } else setRole(null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, [navigate, location]);

  const renderAdminControls = () => (
    <Box
      sx={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 1000,
        display: "flex",
        gap: 1,
        flexDirection: "column",
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
    <I18nextProvider i18n={i18n}>
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
        <CompleteProfileModal
          open={showCompleteProfile}
          onClose={() => {
            setShowCompleteProfile(false);
            // Reload profile to check if it's complete now
            if (session?.user) {
              supabase
                .from("profiles")
                .select("full_name, phone")
                .eq("id", session.user.id)
                .single()
                .then(({ data }) => {
                  if (data && data.full_name && data.phone) {
                    setShowCompleteProfile(false);
                  }
                });
            }
          }}
          userEmail={session?.user?.email}
        />
        <PWAInstallPrompt />
      </LocalizationProvider>
    </I18nextProvider>
  );
}

export default App;
