import { useEffect, useState } from "react";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";
import { Box } from "@mui/material";
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

  // Listen for custom event from LoginModal to show CompleteProfileModal
  useEffect(() => {
    const handleShowCompleteProfile = () => {
      console.log("[App] Received show-complete-profile event");
      setShowCompleteProfile(true);
    };

    window.addEventListener('show-complete-profile', handleShowCompleteProfile);
    return () => {
      window.removeEventListener('show-complete-profile', handleShowCompleteProfile);
    };
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      // Handle OAuth callback - check for hash fragments
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const expiresIn = hashParams.get("expires_in");
      const tokenType = hashParams.get("token_type");
      const error = hashParams.get("error");

      if (error) {
        console.error("OAuth error:", error);
        window.history.replaceState(null, "", window.location.pathname);
        setLoading(false);
        return;
      }

      // If we have OAuth tokens in URL, handle them directly without Supabase client
      if (accessToken && refreshToken) {
        console.log(
          "[App] OAuth callback detected, handling tokens directly..."
        );

        try {
          // Decode the JWT to get user info
          const tokenParts = accessToken.split(".");
          if (tokenParts.length !== 3) {
            throw new Error("Invalid JWT format");
          }

          const payload = JSON.parse(atob(tokenParts[1]));
          console.log("[App] Token payload decoded:", payload.sub);

          // Calculate expiry time
          const expiresAt =
            Math.floor(Date.now() / 1000) + parseInt(expiresIn || "3600");

          // Construct session object that matches Supabase Session type
          const user = {
            id: payload.sub,
            aud: payload.aud,
            role: payload.role,
            email: payload.email,
            email_confirmed_at: payload.email_confirmed_at,
            phone: payload.phone,
            app_metadata: payload.app_metadata || {},
            user_metadata: payload.user_metadata || {},
            identities: payload.identities || [],
            created_at: payload.created_at || new Date().toISOString(),
            updated_at: payload.updated_at || new Date().toISOString(),
          };

          const sessionData = {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: parseInt(expiresIn || "3600"),
            expires_at: expiresAt,
            token_type: tokenType || "bearer",
            user: user,
          };

          // Store in localStorage with the same key Supabase uses
          localStorage.setItem("sb-auth-token", JSON.stringify(sessionData));
          console.log("[App] Session stored in localStorage");

          // Set session state
          setSession(sessionData as unknown as Session);

          // Fetch user role using direct REST API
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          try {
            const profileResponse = await fetch(
              `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}&select=role,full_name,phone`,
              {
                headers: {
                  apikey: supabaseKey,
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
              }
            );

            if (profileResponse.ok) {
              const profiles = await profileResponse.json();
              if (profiles && profiles.length > 0) {
                const profile = profiles[0];
                setRole(profile.role || null);
                console.log("[App] Profile loaded, role:", profile.role);

                // Check if profile needs to be completed
                if (!profile.full_name || !profile.phone) {
                  setShowCompleteProfile(true);
                }

                // Redirect based on role
                if (
                  profile.role === "admin" &&
                  location.pathname !== "/admin"
                ) {
                  navigate("/admin");
                } else if (
                  profile.role === "owner" &&
                  location.pathname !== "/owner"
                ) {
                  navigate("/owner");
                } else if (
                  profile.role === "user" &&
                  location.pathname !== "/"
                ) {
                  navigate("/");
                }
              } else {
                // Profile doesn't exist - show complete profile modal
                console.log(
                  "[App] No profile found, showing complete profile modal"
                );
                setShowCompleteProfile(true);
              }
            } else {
              console.error(
                "[App] Error fetching profile:",
                profileResponse.statusText
              );
            }
          } catch (profileErr) {
            console.error("[App] Exception fetching profile:", profileErr);
          }
        } catch (err) {
          console.error("[App] Exception handling OAuth tokens:", err);
        }

        // Remove hash after processing
        window.history.replaceState(null, "", window.location.pathname);
        setLoading(false);
        return;
      }

      // No OAuth tokens - try to get session from localStorage
      console.log("[App] Checking for existing session in localStorage...");
      try {
        const storedSession = localStorage.getItem("sb-auth-token");
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);

          // Check if session is expired
          const now = Math.floor(Date.now() / 1000);
          if (sessionData.expires_at && sessionData.expires_at > now) {
            console.log("[App] Found valid session in localStorage");
            setSession(sessionData as unknown as Session);

            // Fetch role and profile info using REST API
            if (sessionData.user?.id) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

              const profileResponse = await fetch(
                `${supabaseUrl}/rest/v1/profiles?id=eq.${sessionData.user.id}&select=role,full_name,phone`,
                {
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${sessionData.access_token}`,
                    "Content-Type": "application/json",
                  },
                }
              );

              if (profileResponse.ok) {
                const profiles = await profileResponse.json();
                if (profiles && profiles.length > 0) {
                  const profile = profiles[0];
                  setRole(profile.role || null);
                  
                  // Check if profile needs to be completed on every session load
                  if (!profile.full_name || !profile.phone) {
                    console.log("[App] Profile incomplete on session restore, showing modal");
                    setShowCompleteProfile(true);
                  }
                } else {
                  // No profile exists - show complete profile modal
                  console.log("[App] No profile found on session restore, showing modal");
                  setShowCompleteProfile(true);
                }
              }
            }
          } else {
            console.log("[App] Session expired, clearing localStorage");
            localStorage.removeItem("sb-auth-token");
          }
        } else {
          console.log("[App] No session found in localStorage");
        }
      } catch (err) {
        console.error("[App] Error reading session from localStorage:", err);
      }

      setLoading(false);
    };

    loadSession();

    // Listen for storage events to detect sign-out from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "sb-auth-token") {
        if (!e.newValue) {
          console.log("[App] Session cleared from storage, logging out");
          setSession(null);
          setRole(null);
        } else {
          try {
            const newSession = JSON.parse(e.newValue);
            setSession(newSession as unknown as Session);
          } catch (err) {
            console.error("[App] Error parsing new session:", err);
          }
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Also listen for custom storage events (for same-tab signout)
    const handleCustomStorage = () => {
      const storedSession = localStorage.getItem("sb-auth-token");
      if (!storedSession) {
        console.log("[App] Custom storage event: session cleared");
        setSession(null);
        setRole(null);
      }
    };

    window.addEventListener("storage", handleCustomStorage);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storage", handleCustomStorage);
    };
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
            console.log("[App] CompleteProfileModal closed");
            setShowCompleteProfile(false);
          }}
          userEmail={session?.user?.email}
        />
        <PWAInstallPrompt />
      </LocalizationProvider>
    </I18nextProvider>
  );
}

export default App;
