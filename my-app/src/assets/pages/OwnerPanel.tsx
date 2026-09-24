import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { toggleTheme } from "../../slices/themeSlice";
import OwnerCalendar from "../components/OwnerCalendar";
import BookingStatistics from "../components/BookingStatistics";
import ReferralStats from "../components/ReferralStats";
import ProductCatalog from "../components/ProductCatalog";
import BusinessSettings from "../components/BusinessSettings";
import StaffManager from "../components/StaffManager";
import BillingPanel from "../components/BillingPanel";
import ServicesManager from "../components/ServicesManager";
import OnboardingChecklist from "../../components/OnboardingChecklist";
import { daysLeft, isTenantActive, type TenantBilling } from "../components/billing";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  IconButton,
  Drawer,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "dayjs";
import "dayjs/locale/el";
import { useTranslation } from "react-i18next";
import { supabase } from "../components/supabaseClient";
import { useTenantContext } from "../../context/useTenantContext";
import {
  fetchProfessionals,
  getProfessionalNameByCode,
  type ProfessionalOption,
} from "../components/professionalsService";

interface Booking {
  id: string;
  date: string;
  user_id: string;
  professional_id: string;
  location: string;
  services: string;
  status: string;
  created_at: string;
  payment_method?: "cash" | "card";
  payment_status?: "unpaid" | "paid" | "refunded";
}

interface UserProfile {
  full_name: string;
  phone: string;
  email: string;
}

export default function OwnerPanel() {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = useResolvedColors();
  const { t, i18n } = useTranslation();
  const dayLocale = i18n.language === "gr" ? "el" : "en";
  const { tenant } = useTenantContext();
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedProfessional] = useState<string>("all");
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [userNameMap, setUserNameMap] = useState<Record<string, string>>({});
  const [showNewBookingDialog, setShowNewBookingDialog] = useState(false);
  const [newBookingDate, setNewBookingDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [newBookingStartTime, setNewBookingStartTime] = useState("09:00");
  const [newBookingEndTime, setNewBookingEndTime] = useState("10:00");
  const [newBookingProfessional, setNewBookingProfessional] = useState("");
  const [newBookingServices, setNewBookingServices] = useState<string[]>([]);
  const [newBookingUserId, setNewBookingUserId] = useState("");

  const professionalNameMap = professionals.reduce<Record<string, string>>(
    (acc, professional) => {
      acc[professional.code] = professional.name;
      return acc;
    },
    {},
  );

  const today = dayjs().format("YYYY-MM-DD");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return {
      apikey: supabaseKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    const loadData = async () => {
      await loadProfessionals();
      await loadBookings();
      await loadServiceMap();
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const loadProfessionals = async () => {
    if (!tenant?.id) return;

    try {
      const data = await fetchProfessionals(tenant.id);
      if (isMountedRef.current) setProfessionals(data);
    } catch (err) {
      console.error("[OwnerPanel] Exception loading professionals:", err);
    }
  };

  const loadBookings = async () => {
    if (!tenant?.id) return;

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        console.error("[OwnerPanel] No auth token available");
        return;
      }
      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookings?select=*&order=date.desc&tenant_id=eq.${tenant.id}`,
        { headers },
      );
      if (!response.ok) {
        const text = await response.text();
        console.error("[OwnerPanel] Bookings fetch error:", response.status, text);
        return;
      }
      const data = await response.json();
      if (isMountedRef.current) {
        setAllBookings(data);
        // load names for all unique users in one query
        const ids: string[] = [...new Set<string>(data.map((b: Booking) => b.user_id))];
        if (ids.length > 0) loadUserNames(ids, headers);
      }
    } catch (err) {
      console.error("[OwnerPanel] Exception loading bookings:", err);
    }
  };

  const loadUserNames = async (ids: string[], headers: Record<string, string>) => {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=in.(${ids.join(",")})&select=id,full_name`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<string, string> = {};
      data.forEach((p: { id: string; full_name: string }) => {
        if (p.full_name) map[p.id] = p.full_name;
      });
      if (isMountedRef.current) setUserNameMap(map);
    } catch (err) {
      console.error("[OwnerPanel] Exception loading user names:", err);
    }
  };

  const loadServiceMap = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name")
        .eq("tenant_id", tenant.id);
      if (error || !data) return;
      const map: Record<string, string> = {};
      data.forEach((s: { id: string; name: string }) => { map[s.id] = s.name; });
      if (isMountedRef.current) setServiceMap(map);
    } catch (err) {
      console.error("[OwnerPanel] Exception loading services:", err);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name,phone,email&limit=1`,
        { headers },
      );
      if (!response.ok) return;
      const data = await response.json();
      const profileData = data?.[0];
      if (profileData) {
        setUserProfile({
          full_name: profileData.full_name || "N/A",
          phone: profileData.phone || "N/A",
          email: profileData.email || "N/A",
        });
      } else {
        setUserProfile({
          full_name: "N/A",
          phone: "N/A",
          email: "N/A",
        });
      }
    } catch (err) {
      console.error("[OwnerPanel] Exception loading profile:", err);
    }
  };

  const filteredBookings =
    selectedProfessional === "all"
      ? allBookings
      : allBookings.filter((b) => b.professional_id === selectedProfessional);

  const upcomingBookings = filteredBookings.filter((b) => b.date >= today);

  const getProfessionalName = (profId: string) => {
    return getProfessionalNameByCode(professionals, profId);
  };

  const getServiceNames = (servicesJson: string) => {
    try {
      const parsed = JSON.parse(servicesJson);
      const ids: string[] = Array.isArray(parsed) ? parsed : [parsed];
      return ids.map((id) => serviceMap[id] || id).join(", ");
    } catch {
      // bare UUID or plain string
      return serviceMap[servicesJson] || servicesJson;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [activeView, setActiveView] = useState<"dashboard" | "calendar" | "statistics" | "services" | "products" | "staff" | "settings" | "billing">("dashboard");
  const [billing, setBilling] = useState<TenantBilling | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);

  const loadBilling = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from("tenant_billing")
      .select("plan, status, trial_ends_at, current_period_end, past_due_since, stripe_customer_id, stripe_connect_account_id, connect_charges_enabled")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (isMountedRef.current) setBilling(data);
  };

  useEffect(() => {
    loadBilling();
    // Back from Stripe Checkout/Portal: the webhook may land a moment after the redirect.
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "done") {
      // Back from Stripe Connect onboarding: pull the account's status now rather than wait for the webhook.
      params.delete("connect");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
      setActiveView("settings");
      supabase.functions.invoke("billing", { body: { action: "connect_status" } }).then(loadBilling);
      return;
    }
    const result = params.get("billing");
    if (!result) return;
    setActiveView("billing");
    setBillingNotice(result === "success" ? t("owner.billing_success") : t("owner.billing_canceled"));
    params.delete("billing");
    const qs = params.toString();
    window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    const timer = setTimeout(loadBilling, 4000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const billingActive = isTenantActive(billing);
  const trialDaysLeft = billing?.status === "trialing" ? daysLeft(billing.trial_ends_at) : null;
  const view = billingActive ? activeView : "billing";
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "confirmed" | "pending" | "cancelled">("all");

  const confirmedCount = allBookings.filter((b) => b.status === "confirmed").length;
  const pendingCount = allBookings.filter((b) => b.status === "pending").length;

  const visibleBookings = statusFilter === "all"
    ? filteredBookings
    : filteredBookings.filter((b) => b.status === statusFilter);

  const tenantInitial = tenant?.name?.[0]?.toUpperCase() ?? "O";

  const STATUS_COLOR: Record<string, string> = {
    confirmed: colors.status.confirmed,
    pending: colors.status.pending,
    cancelled: colors.status.cancelled,
    completed: colors.status.completed,
    expired: colors.status.expired,
  };

  const sidebarItems = [
    { key: "dashboard",   icon: "dashboard",       label: t("owner.nav_dashboard") },
    { key: "calendar",    icon: "calendar_month",  label: t("owner.nav_calendar") },
    { key: "statistics",  icon: "bar_chart",       label: t("owner.nav_statistics") },
    { key: "services",    icon: "content_cut",     label: t("owner.nav_services") },
    { key: "products",    icon: "inventory_2",     label: t("owner.nav_products") },
    { key: "staff",       icon: "groups",          label: t("owner.nav_staff") },
    { key: "settings",    icon: "settings",        label: t("owner.nav_settings") },
    { key: "billing",     icon: "credit_card",     label: t("owner.nav_billing") },
  ] as const;
  // Locked out of everything but Billing until the subscription is sorted.
  const visibleNavItems = billingActive ? sidebarItems : sidebarItems.filter((i) => i.key === "billing");

  const renderNavContent = (collapsed = false) => (
    <>
      {!collapsed && (
        <Box sx={{ px: 2, mb: 0.5, fontSize: 10, fontWeight: 700, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {t("owner.management")}
        </Box>
      )}
      {visibleNavItems.map((item) => {
        const active = view === item.key;
        return (
          <Box
            key={item.key}
            onClick={() => { setActiveView(item.key); setMobileNavOpen(false); }}
            title={collapsed ? item.label : undefined}
            sx={{
              display: "flex", alignItems: "center", gap: 1.25,
              justifyContent: collapsed ? "center" : "flex-start",
              px: collapsed ? 1 : 2.5, py: 1.1,
              cursor: "pointer", fontSize: 13,
              color: active ? colors.accent.main : colors.text.secondary,
              background: active ? colors.background.overlay : "transparent",
              borderLeft: `3px solid ${active ? colors.accent.main : "transparent"}`,
              fontWeight: active ? 600 : 400,
              transition: "all 0.15s",
              "&:hover": {
                color: colors.text.primary,
                background: colors.background.card,
              },
            }}
          >
            <span className="material-icons" style={{ fontSize: 18 }}>{item.icon}</span>
            {!collapsed && item.label}
          </Box>
        );
      })}
      <Box sx={{ mt: "auto" }}>
        <Box
          onClick={handleLogout}
          title={collapsed ? t("account.sign_out") : undefined}
          sx={{
            display: "flex", alignItems: "center", gap: 1.25,
            justifyContent: collapsed ? "center" : "flex-start",
            px: collapsed ? 1 : 2.5, py: 1.1,
            cursor: "pointer", fontSize: 13,
            color: colors.error.main,
            transition: "all 0.15s",
            "&:hover": { background: colors.background.card },
          }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>exit_to_app</span>
          {!collapsed && t("account.sign_out")}
        </Box>
      </Box>
    </>
  );

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: colors.background.dark,
        color: colors.text.primary,
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      {/* Topbar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, sm: 3 },
          height: 56,
          backgroundColor: colors.background.medium,
          borderBottom: `1px solid ${colors.border.main}`,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            onClick={() => setMobileNavOpen(true)}
            size="small"
            sx={{ color: colors.text.secondary, display: { xs: "flex", sm: "none" } }}
            aria-label={t("owner.open_nav")}
          >
            <MenuIcon fontSize="small" />
          </IconButton>
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "50%",
              background: colors.accent.main,
              border: `2px solid ${colors.accent.main}`,
              flexShrink: 0,
            }}
          />
          <Box>
            <Box sx={{ fontSize: 15, fontWeight: 700 }}>{tenant?.name ?? t("owner.panel")}</Box>
            <Box sx={{ fontSize: 11, color: colors.text.secondary }}>{t("owner.dashboard")}</Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            size="small"
            sx={{ color: colors.text.secondary }}
            aria-label={t("common.toggle_theme")}
          >
            {mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </IconButton>
          <Box
            sx={{
              border: `1px solid ${colors.accent.main}`,
              color: colors.accent.main,
              borderRadius: 9999,
              px: 1.5, py: 0.4,
              fontSize: 11, fontWeight: 600,
              background: colors.background.overlay,
            }}
          >
            {t("owner.badge")}
          </Box>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: "50%",
              background: colors.accent.main,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, color: "#fff",
            }}
          >
            {tenantInitial}
          </Box>
        </Box>
      </Box>

      {/* Layout */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar (persistent on sm+) */}
        <Box
          sx={{
            width: sidebarCollapsed ? 64 : 220, flexShrink: 0,
            backgroundColor: colors.background.medium,
            borderRight: `1px solid ${colors.border.main}`,
            py: 2.5,
            display: { xs: "none", sm: "flex" }, flexDirection: "column",
            transition: "width 0.15s",
            position: "relative",
          }}
        >
          <IconButton
            onClick={() => setSidebarCollapsed((v) => !v)}
            size="small"
            aria-label={sidebarCollapsed ? t("owner.expand_sidebar") : t("owner.collapse_sidebar")}
            sx={{
              position: "absolute", top: 4, right: -12,
              width: 24, height: 24,
              backgroundColor: colors.background.card,
              border: `1px solid ${colors.border.main}`,
              color: colors.text.secondary,
              "&:hover": { backgroundColor: colors.background.overlay },
            }}
          >
            {sidebarCollapsed ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ChevronLeftIcon sx={{ fontSize: 16 }} />}
          </IconButton>
          {renderNavContent(sidebarCollapsed)}
        </Box>

        {/* Sidebar (drawer on xs) */}
        <Drawer
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          sx={{ display: { xs: "block", sm: "none" } }}
          PaperProps={{
            sx: {
              width: 220,
              backgroundColor: colors.background.medium,
              py: 2.5,
              display: "flex", flexDirection: "column",
            },
          }}
        >
          {renderNavContent()}
        </Drawer>

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1.5, sm: 3 } }}>

          {billingNotice && (
            <Box
              onClick={() => setBillingNotice(null)}
              sx={{ mb: 2, p: 1.5, borderRadius: "8px", fontSize: 13, cursor: "pointer", background: colors.background.overlay, border: `1px solid ${colors.accent.main}` }}
            >
              {billingNotice}
            </Box>
          )}
          {billingActive && trialDaysLeft !== null && trialDaysLeft <= 7 && view !== "billing" && (
            <Box
              onClick={() => setActiveView("billing")}
              sx={{ mb: 2, p: 1.5, borderRadius: "8px", fontSize: 13, cursor: "pointer", background: colors.background.overlay, border: `1px solid ${colors.status.pending}` }}
            >
              {t("owner.trial_ends", { count: trialDaysLeft })}
            </Box>
          )}

          {/* ── Dashboard view ── */}
          {view === "dashboard" && (
            <>
              <OnboardingChecklist billing={billing} onNavigate={setActiveView} />
              {/* Stat cards */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 1.75, mb: 3 }}>
                {[
                  { val: allBookings.length, label: t("owner.total_bookings"), icon: "calendar_month", color: colors.accent.main },
                  { val: confirmedCount,     label: t("status.confirmed"),       icon: "check_circle",  color: colors.status.confirmed },
                  { val: pendingCount,       label: t("status.pending"),          icon: "pending",       color: colors.status.pending },
                  { val: upcomingBookings.length, label: t("owner.upcoming"),   icon: "event",         color: colors.accent.light },
                ].map(({ val, label, icon, color }) => (
                  <Box
                    key={label}
                    sx={{
                      background: colors.background.medium,
                      borderRadius: "10px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                      p: 2,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <Box>
                      <Box sx={{ fontSize: 28, fontWeight: 700, color }}>{val}</Box>
                      <Box sx={{ fontSize: 11, color: colors.text.secondary, mt: 0.25 }}>{label}</Box>
                    </Box>
                    <Box sx={{ borderRadius: "12px", p: 1.25, background: `${color}22`, display: "flex" }}>
                      <span className="material-icons" style={{ fontSize: 28, color }}>{icon}</span>
                    </Box>
                  </Box>
                ))}
              </Box>

              {/* Bookings table */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
                <Box sx={{ fontSize: 16, fontWeight: 700 }}>{t("owner.recent_bookings")}</Box>
                <Box sx={{ display: "flex", gap: 0.75 }}>
                  {(["all","confirmed","pending","cancelled"] as const).map((f) => (
                    <Box
                      key={f}
                      component="button"
                      onClick={() => setStatusFilter(f)}
                      sx={{
                        borderRadius: 9999, px: 1.5, py: 0.5,
                        fontSize: 11, fontWeight: 500, cursor: "pointer",
                        border: `1px solid ${statusFilter === f ? colors.accent.main : colors.border.main}`,
                        background: statusFilter === f ? colors.accent.main : "transparent",
                        color: statusFilter === f ? "#fff" : colors.text.secondary,
                        fontFamily: "inherit", transition: "all 0.15s",
                      }}
                    >
                      {f === "all" ? t("owner.filter_all") : t(`status.${f}`)}
                    </Box>
                  ))}
                </Box>
              </Box>

              <Box sx={{ background: colors.background.medium, borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
                {/* Table head */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1.4fr 1fr 80px", sm: "1.4fr 1fr 1fr 1fr 100px" },
                    px: 2, py: 1.25,
                    background: colors.background.card,
                    fontSize: 11, fontWeight: 600, color: colors.text.tertiary,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                  }}
                >
                  <span>{t("owner.col_client")}</span><span>{t("owner.col_services")}</span>
                  <Box component="span" sx={{ display: { xs: "none", sm: "block" } }}>{t("owner.col_professional")}</Box>
                  <Box component="span" sx={{ display: { xs: "none", sm: "block" } }}>{t("owner.col_date")}</Box>
                  <span>{t("owner.col_status")}</span>
                </Box>

                {visibleBookings.length === 0 && (
                  <Box sx={{ p: 3, textAlign: "center", color: colors.text.tertiary, fontSize: 13 }}>
                    {t("owner.no_bookings")}
                  </Box>
                )}

                {visibleBookings.slice(0, 20).map((booking) => {
                  const statusColor = STATUS_COLOR[booking.status] ?? colors.text.tertiary;
                  return (
                    <Box
                      key={booking.id}
                      onClick={() => {
                        setSelectedBooking(booking);
                        loadUserProfile(booking.user_id);
                        setShowBookingDialog(true);
                      }}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1.4fr 1fr 80px", sm: "1.4fr 1fr 1fr 1fr 100px" },
                        px: 2, py: 1.5,
                        alignItems: "center",
                        fontSize: 13,
                        borderTop: `1px solid ${colors.border.main}`,
                        cursor: "pointer",
                        transition: "background 0.1s",
                        "&:hover": { background: colors.background.card },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: colors.accent.main,
                            color: "#fff", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}
                        >
                          {(userNameMap[booking.user_id] ?? booking.user_id).slice(0, 2).toUpperCase()}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Box sx={{ fontSize: 13, color: colors.text.primary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {userNameMap[booking.user_id] ?? booking.user_id.slice(0, 8) + "…"}
                          </Box>
                          <Box sx={{ display: { xs: "block", sm: "none" }, fontSize: 11, color: colors.text.tertiary }}>
                            {dayjs(booking.date).locale(dayLocale).format("ddd MMM D")}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getServiceNames(booking.services)}</Box>
                      <Box sx={{ display: { xs: "none", sm: "block" } }}>{getProfessionalName(booking.professional_id)}</Box>
                      <Box sx={{ display: { xs: "none", sm: "block" } }}>{dayjs(booking.date).locale(dayLocale).format("ddd MMM D")}</Box>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block", px: 1.1, py: 0.25,
                          borderRadius: 9999, background: statusColor,
                          color: "#fff", fontSize: 10, fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {t(`status.${booking.status}`, { defaultValue: booking.status })}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}

          {/* ── Calendar view ── */}
          {view === "calendar" && (
            <Box sx={{ height: "calc(100vh - 64px)", overflow: "hidden" }}>
              <OwnerCalendar
                bookings={allBookings}
                professionals={professionals}
                serviceMap={serviceMap}
                onBookingClick={(b) => {
                  setSelectedBooking(b);
                  setShowBookingDialog(true);
                  loadUserProfile(b.user_id);
                }}
                onNewBooking={(date) => {
                  setNewBookingDate(date);
                  setNewBookingProfessional(professionals[0]?.code ?? "");
                  setNewBookingServices([]);
                  setNewBookingUserId("");
                  setShowNewBookingDialog(true);
                }}
              />
            </Box>
          )}

          {/* ── Statistics view ── */}
          {view === "statistics" && (
            <>
              <BookingStatistics
                allBookings={allBookings}
                professionalNameMap={professionalNameMap}
                tenantId={tenant?.id ?? ""}
              />
              <ReferralStats tenantId={tenant?.id ?? ""} />
            </>
          )}

          {/* ── Services view ── */}
          {view === "services" && <ServicesManager tenantId={tenant?.id ?? ""} />}

          {/* ── Products view ── */}
          {view === "products" && <ProductCatalog tenantId={tenant?.id ?? ""} />}

          {/* ── Staff view ── */}
          {view === "staff" && (
            <StaffManager tenantId={tenant?.id ?? ""} professionals={professionals} onChanged={loadProfessionals} />
          )}

          {/* ── Billing view ── */}
          {view === "billing" && <BillingPanel billing={billing} />}

          {/* ── Settings view ── */}
          {view === "settings" && <BusinessSettings billing={billing} />}

        </Box>
      </Box>

      {/* Booking Details Dialog */}
      <Dialog
        open={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("owner.booking_details")}</DialogTitle>
        <DialogContent>
          {selectedBooking && userProfile && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                {t("owner.customer_info")}
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>{t("owner.name_label")}</strong> {userProfile.full_name}
                </Typography>
                <Typography variant="body1">
                  <strong>{t("owner.email_label")}</strong> {userProfile.email}
                </Typography>
                <Typography variant="body1">
                  <strong>{t("owner.phone_label")}</strong> {userProfile.phone}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom color="primary">
                {t("owner.appointment_details")}
              </Typography>
              <Typography variant="body1">
                <strong>{t("booking.date_label")}</strong>{" "}
                {dayjs(selectedBooking.date).locale(dayLocale).format("MMMM DD, YYYY")}
              </Typography>
              {selectedBooking.payment_method && (
                <Typography variant="body1">
                  <strong>{t("owner.payment_label")}</strong>{" "}
                  {selectedBooking.payment_method === "card" ? t("owner.pay_card") : t("owner.pay_venue")} ·{" "}
                  {selectedBooking.payment_status === "paid"
                    ? t("owner.paid")
                    : selectedBooking.payment_status === "refunded"
                      ? t("owner.refunded")
                      : t("owner.not_paid")}
                </Typography>
              )}
              <Typography variant="body1">
                <strong>{t("booking.professional_label")}</strong>{" "}
                {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
              <Typography variant="body1">
                <strong>{t("booking.location_label")}</strong>{" "}
                {selectedBooking.location === "your_place"
                  ? t("owner.at_customer_place")
                  : t("booking.at_our_place")}
              </Typography>
              <Typography variant="body1">
                <strong>{t("owner.services_label")}</strong>{" "}
                {getServiceNames(selectedBooking.services)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>{t("owner.status_label")}</strong>
                <span
                  style={{
                    marginLeft: "8px",
                    padding: "4px 12px",
                    borderRadius: "12px",
                    backgroundColor:
                      selectedBooking.status === "confirmed"
                        ? colors.status.confirmed
                        : selectedBooking.status === "pending"
                          ? colors.accent.main
                          : selectedBooking.status === "completed"
                            ? "#6366f1"
                            : selectedBooking.status === "expired"
                              ? "#78716c"
                              : colors.error.main,
                    color: "white",
                    fontSize: "0.875rem",
                    fontWeight: "bold",
                  }}
                >
                  {t(`status.${selectedBooking.status}`, { defaultValue: selectedBooking.status }).toUpperCase()}
                </span>
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, "& > button": { m: 0 } }}>
          {/* Owner can force-confirm a pending booking (bypasses customer confirmation) */}
          {selectedBooking && selectedBooking.status === "pending" && (
            <Button
              onClick={async () => {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  {
                    method: "PATCH",
                    headers: { ...headers, Prefer: "return=minimal" },
                    body: JSON.stringify({
                      status: "confirmed",
                      confirmed_at: new Date().toISOString(),
                    }),
                  },
                );
                if (!res.ok) {
                  alert(t("owner.status_error", { error: await res.text() }));
                } else {
                  alert(t("owner.force_confirmed"));
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="success"
              sx={{ mr: 1 }}
            >
              {t("owner.force_confirm")}
            </Button>
          )}
          {/* Re-open an expired booking — puts it back to pending so customer can confirm */}
          {selectedBooking && selectedBooking.status === "expired" && (
            <Button
              onClick={async () => {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  {
                    method: "PATCH",
                    headers: { ...headers, Prefer: "return=minimal" },
                    body: JSON.stringify({ status: "pending" }),
                  },
                );
                if (!res.ok) {
                  alert(t("owner.reopen_error", { error: await res.text() }));
                } else {
                  alert(t("owner.reopened"));
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="warning"
              sx={{ mr: 1 }}
            >
              {t("owner.reopen")}
            </Button>
          )}
          {selectedBooking && selectedBooking.status === "confirmed" && (
            <Button
              onClick={async () => {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  {
                    method: "PATCH",
                    headers: { ...headers, Prefer: "return=minimal" },
                    body: JSON.stringify({ status: "pending" }),
                  },
                );
                if (!res.ok) {
                  alert(t("owner.status_error", { error: await res.text() }));
                } else {
                  alert(t("owner.set_pending_done"));
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="warning"
              sx={{ mr: 1 }}
            >
              {t("owner.set_pending")}
            </Button>
          )}
          {selectedBooking && selectedBooking.status === "confirmed" && (
            <Button
              onClick={async () => {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  {
                    method: "PATCH",
                    headers: { ...headers, Prefer: "return=minimal" },
                    body: JSON.stringify({ status: "completed" }),
                  },
                );
                if (!res.ok) {
                  alert(t("owner.status_error", { error: await res.text() }));
                } else {
                  alert(t("owner.completed_done"));
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="contained"
              color="secondary"
              sx={{ mr: 1 }}
            >
              {t("owner.mark_completed")}
            </Button>
          )}
          {selectedBooking &&
            !["cancelled", "expired", "completed"].includes(
              selectedBooking.status,
            ) && (
              <Button
                onClick={() => setShowCancelConfirmDialog(true)}
                variant="outlined"
                color="error"
                sx={{ mr: 1 }}
              >
                {t("account.cancel_booking")}
              </Button>
            )}
          {selectedBooking && (
            <Button
              onClick={() => setShowDeleteConfirmDialog(true)}
              variant="contained"
              color="error"
              sx={{ mr: 1 }}
            >
              {t("owner.delete_booking")}
            </Button>
          )}
          <Button
            onClick={() => setShowBookingDialog(false)}
            variant="contained"
          >
            {t("common.close")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={showNewBookingDialog} onClose={() => setShowNewBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t("owner.new_booking")}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("owner.col_date")}</Typography>
              <Box component="input" type="date" value={newBookingDate}
                onChange={e => setNewBookingDate(e.target.value)}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{t("owner.start_time")}</Typography>
                <Box component="input" type="time" value={newBookingStartTime}
                  onChange={e => setNewBookingStartTime(e.target.value)}
                  sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">{t("owner.end_time")}</Typography>
                <Box component="input" type="time" value={newBookingEndTime}
                  onChange={e => setNewBookingEndTime(e.target.value)}
                  sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("owner.col_professional")}</Typography>
              <Box component="select" value={newBookingProfessional}
                onChange={e => setNewBookingProfessional(e.target.value)}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
              >
                {professionals.map(p => (
                  <option key={p.code} value={p.code}>{p.name}</option>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("owner.services_multi")}</Typography>
              <Box component="select" multiple value={newBookingServices}
                onChange={e => setNewBookingServices(Array.from((e.target as HTMLSelectElement).selectedOptions, o => o.value))}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14, minHeight: 100 }}
              >
                {Object.entries(serviceMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">{t("owner.client")}</Typography>
              <Box component="select" value={newBookingUserId}
                onChange={e => setNewBookingUserId(e.target.value)}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
              >
                <option value="">{t("owner.select_client")}</option>
                {Object.entries(userNameMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewBookingDialog(false)} variant="outlined">{t("common.cancel")}</Button>
          <Button
            disabled={!newBookingUserId || !newBookingProfessional || newBookingServices.length === 0}
            variant="contained"
            onClick={async () => {
              const headers = await getAuthHeaders();
              if (!headers) return;
              const res = await fetch(`${supabaseUrl}/rest/v1/bookings`, {
                method: "POST",
                headers: { ...headers, Prefer: "return=minimal" },
                body: JSON.stringify({
                  tenant_id: tenant?.id,
                  date: newBookingDate,
                  start_time: newBookingStartTime,
                  end_time: newBookingEndTime,
                  professional_id: newBookingProfessional,
                  services: JSON.stringify(newBookingServices),
                  user_id: newBookingUserId,
                  location: "our_place",
                  status: "confirmed",
                }),
              });
              if (!res.ok) {
                alert(t("booking.create_error_detail", { error: await res.text() }));
              } else {
                await loadBookings();
                setShowNewBookingDialog(false);
              }
            }}
          >
            {t("owner.create_booking")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={showCancelConfirmDialog}
        onClose={() => setShowCancelConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("owner.cancel_title")}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {t("owner.cancel_text")}
          </Typography>
          {selectedBooking && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: colors.background.light,
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>{t("owner.booking_date")}</strong>{" "}
                {dayjs(selectedBooking.date).locale(dayLocale).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>{t("booking.professional_label")}</strong>{" "}
                {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowCancelConfirmDialog(false)}
            variant="outlined"
          >
            {t("account.keep_it")}
          </Button>
          <Button
            onClick={async () => {
              if (selectedBooking) {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  {
                    method: "PATCH",
                    headers: { ...headers, Prefer: "return=minimal" },
                    body: JSON.stringify({ status: "cancelled" }),
                  },
                );
                if (!res.ok) {
                  alert(t("account.cancel_error", { error: await res.text() }));
                } else {
                  alert(t("owner.cancelled_done"));
                  await loadBookings();
                  setShowCancelConfirmDialog(false);
                  setShowBookingDialog(false);
                }
              }
            }}
            variant="contained"
            color="error"
          >
            {t("account.yes_cancel")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmDialog}
        onClose={() => setShowDeleteConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: colors.error.main }}>
          {t("owner.delete_title")}
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ color: colors.error.main, fontWeight: "bold", mb: 2 }}
          >
            {t("owner.delete_warning")}
          </Typography>
          <Typography variant="body1">
            {t("owner.delete_text")}
          </Typography>
          {selectedBooking && (
            <Box
              sx={{
                mt: 2,
                p: 2,
                backgroundColor: colors.background.light,
                borderRadius: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>{t("owner.booking_date")}</strong>{" "}
                {dayjs(selectedBooking.date).locale(dayLocale).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>{t("booking.professional_label")}</strong>{" "}
                {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>{t("owner.status_label")}</strong> {t(`status.${selectedBooking.status}`, { defaultValue: selectedBooking.status })}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDeleteConfirmDialog(false)}
            variant="contained"
          >
            {t("account.keep_it")}
          </Button>
          <Button
            onClick={async () => {
              if (selectedBooking) {
                const headers = await getAuthHeaders();
                if (!headers) return;
                const res = await fetch(
                  `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}`,
                  { method: "DELETE", headers },
                );
                if (!res.ok) {
                  alert(t("owner.delete_error", { error: await res.text() }));
                } else {
                  alert(t("owner.deleted_done"));
                  await loadBookings();
                  setShowDeleteConfirmDialog(false);
                  setShowBookingDialog(false);
                }
              }
            }}
            variant="contained"
            color="error"
          >
            {t("owner.yes_delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
