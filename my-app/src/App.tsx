import { useEffect, useState } from "react";
import { useTenantContext } from "./context/useTenantContext";
import AdminPanel from "./assets/pages/AdminPanel";
import UserPanel from "./assets/pages/UserPanel";
import OwnerPanel from "./assets/pages/OwnerPanel";
import ProfessionalPanel from "./assets/pages/ProfessionalPanel.tsx";
import BookingActionPage from "./assets/pages/BookingActionPage";
import { Box } from "@mui/material";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./assets/components/ProtectedRoute";
import LoadingScreen from "./assets/components/LoadingScreen";
import PWAInstallPrompt from "./assets/components/PWAInstallPrompt";
import CompleteProfileModal from "./assets/components/CompleteProfileModal";
import i18n from "./i18n";
import { I18nextProvider } from "react-i18next";
import { useDispatch } from "react-redux";
import { clearProgress } from "./slices/appSlice";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./assets/components/supabaseClient";

export type Role = "admin" | "user" | "owner" | "professional";

function App() {
  const dispatch = useDispatch();
  const { tenant, loading: tenantLoading, switchTenant } = useTenantContext();

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profileTenantId, setProfileTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);

  // Listen for custom event from LoginModal to show CompleteProfileModal
  useEffect(() => {
    const handleShowCompleteProfile = () => {
      console.log("[App] Received show-complete-profile event");
      setShowCompleteProfile(true);
    };

    window.addEventListener("show-complete-profile", handleShowCompleteProfile);
    return () => {
      window.removeEventListener(
        "show-complete-profile",
        handleShowCompleteProfile,
      );
    };
  }, []);

  // Effect 1: Subscribe to auth state changes — SYNCHRONOUS ONLY.
  // Never await Supabase queries here: the client holds an internal auth lock
  // during this callback, so any await on supabase.from() inside it deadlocks.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("[App] Auth state changed:", event, newSession?.user?.email);

      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        setSession(newSession ?? null);
        if (!newSession) {
          setRole(null);
          setLoading(false);
        }
        // If there IS a session, Effect 2 will fetch the profile and clear loading
      } else if (event === "TOKEN_REFRESHED") {
        // Token refreshed internally — user hasn't changed, skip profile re-fetch
      } else if (event === "SIGNED_OUT") {
        setSession(null);
        setRole(null);
        setLoading(false);
        dispatch(clearProgress());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect 2: Fetch profile whenever session changes.
  // Runs outside the Supabase auth lock so no deadlock is possible.
  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);

    console.log("[App] Fetching profile for user:", session.user.id);

    (async () => {
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role, full_name, phone, tenant_id")
          .eq("id", session.user.id)
          .single();

        if (cancelled) return;

        if (!error && profile) {
          const userRole = profile.role as Role;
          console.log("[App] Profile loaded, role:", userRole);
          setRole(userRole);
          setProfileTenantId(profile.tenant_id ?? null);

          if (userRole === "owner" && profile.tenant_id) {
            const { data: tenantRow } = await supabase
              .from("tenants")
              .select("slug")
              .eq("id", profile.tenant_id)
              .single();
            if (!cancelled && tenantRow?.slug && tenant?.slug !== tenantRow.slug) {
              // Switch tenant in place — no reload, avoids a "wrong tenant"
              // flash and repeated reloads whenever this effect re-runs.
              await switchTenant(tenantRow.slug);
              const params = new URLSearchParams(window.location.search);
              if (params.get("tenant") !== tenantRow.slug) {
                params.set("tenant", tenantRow.slug);
                window.history.replaceState(
                  {},
                  "",
                  `${window.location.pathname}?${params.toString()}`,
                );
              }
            }
          }

          if (!profile.full_name || !profile.phone) {
            setShowCompleteProfile(true);
          }
        } else {
          console.log("[App] No profile found, showing complete profile");
          setShowCompleteProfile(true);
        }
      } catch (err) {
        console.error("[App] Error fetching profile:", err);
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

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

  // Block render until we know which tenant this domain belongs to
  if (tenantLoading) {
    return <LoadingScreen variant="full" />;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {renderAdminControls()}
        {/* Tenant banner — visible only in dev, remove in production */}
        {import.meta.env.DEV && tenant && (
          <div
            style={{
              position: "fixed",
              bottom: 8,
              right: 12,
              zIndex: 9999,
              background: "#333",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 6,
              fontSize: 11,
              opacity: 0.85,
            }}
          >
            Tenant: <strong>{tenant.name}</strong>{" "}
            <span style={{ opacity: 0.6 }}>({tenant.slug})</span>
          </div>
        )}

        <Routes>
          {/* Public route — redirects to the right panel once role is known */}
          <Route
            path="/"
            element={
              loading ? (
                <LoadingScreen variant="full" />
              ) : session && role === "owner" ? (
                <Navigate to="/owner" replace />
              ) : session && role === "professional" ? (
                <Navigate to="/professional" replace />
              ) : session && role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <UserPanel />
              )
            }
          />
          {/* Public one-tap SMS confirm/cancel link target — no auth required */}
          <Route path="/booking-action" element={<BookingActionPage />} />
          {/* Legacy booking confirmation link target */}
          <Route
            path="/bookings"
            element={
              loading ? (
                <LoadingScreen variant="full" />
              ) : session && role === "owner" ? (
                <Navigate to="/owner" replace />
              ) : session && role === "professional" ? (
                <Navigate to="/professional" replace />
              ) : session && role === "admin" ? (
                <Navigate to="/admin" replace />
              ) : (
                <UserPanel />
              )
            }
          />
          {/* Protected admin route */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute
                session={session}
                role={role}
                allowedRoles={["admin", "owner"]}
                loading={loading}
              >
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          {/* Protected owner route */}
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
          <Route
            path="/professional"
            element={
              <ProtectedRoute
                session={session}
                role={role}
                allowedRoles={["professional"]}
                loading={loading}
              >
                {profileTenantId && tenant?.id && profileTenantId !== tenant.id ? (
                  <Navigate to="/" replace />
                ) : (
                  <ProfessionalPanel />
                )}
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
