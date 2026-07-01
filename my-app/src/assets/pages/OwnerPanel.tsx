import { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { toggleTheme } from "../../slices/themeSlice";
import OwnerCalendar from "../components/OwnerCalendar";
import BookingStatistics from "../components/BookingStatistics";
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

  const [activeView, setActiveView] = useState<"dashboard" | "calendar" | "statistics">("dashboard");
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
    { key: "dashboard",   icon: "dashboard",       label: "Dashboard" },
    { key: "calendar",    icon: "calendar_month",  label: "Calendar" },
    { key: "statistics",  icon: "bar_chart",       label: "Statistics" },
  ] as const;

  const renderNavContent = (collapsed = false) => (
    <>
      {!collapsed && (
        <Box sx={{ px: 2, mb: 0.5, fontSize: 10, fontWeight: 700, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Management
        </Box>
      )}
      {sidebarItems.map((item) => {
        const active = activeView === item.key;
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
          title={collapsed ? "Sign Out" : undefined}
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
          {!collapsed && "Sign Out"}
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
            aria-label="open navigation"
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
            <Box sx={{ fontSize: 15, fontWeight: 700 }}>{tenant?.name ?? "Owner Panel"}</Box>
            <Box sx={{ fontSize: 11, color: colors.text.secondary }}>Owner Dashboard</Box>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            size="small"
            sx={{ color: colors.text.secondary }}
            aria-label="toggle theme"
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
            Owner
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
            aria-label={sidebarCollapsed ? "expand sidebar" : "collapse sidebar"}
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

          {/* ── Dashboard view ── */}
          {activeView === "dashboard" && (
            <>
              {/* Stat cards */}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 1.75, mb: 3 }}>
                {[
                  { val: allBookings.length, label: "Total Bookings", icon: "calendar_month", color: colors.accent.main },
                  { val: confirmedCount,     label: "Confirmed",       icon: "check_circle",  color: colors.status.confirmed },
                  { val: pendingCount,       label: "Pending",          icon: "pending",       color: colors.status.pending },
                  { val: upcomingBookings.length, label: "Upcoming",   icon: "event",         color: colors.accent.light },
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
                <Box sx={{ fontSize: 16, fontWeight: 700 }}>Recent Bookings</Box>
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
                      {f.charAt(0).toUpperCase() + f.slice(1)}
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
                  <span>Client / ID</span><span>Services</span>
                  <Box component="span" sx={{ display: { xs: "none", sm: "block" } }}>Professional</Box>
                  <Box component="span" sx={{ display: { xs: "none", sm: "block" } }}>Date</Box>
                  <span>Status</span>
                </Box>

                {visibleBookings.length === 0 && (
                  <Box sx={{ p: 3, textAlign: "center", color: colors.text.tertiary, fontSize: 13 }}>
                    No bookings found
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
                            {dayjs(booking.date).format("ddd MMM D")}
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getServiceNames(booking.services)}</Box>
                      <Box sx={{ display: { xs: "none", sm: "block" } }}>{getProfessionalName(booking.professional_id)}</Box>
                      <Box sx={{ display: { xs: "none", sm: "block" } }}>{dayjs(booking.date).format("ddd MMM D")}</Box>
                      <Box
                        component="span"
                        sx={{
                          display: "inline-block", px: 1.1, py: 0.25,
                          borderRadius: 9999, background: statusColor,
                          color: "#fff", fontSize: 10, fontWeight: 700,
                          textTransform: "capitalize",
                        }}
                      >
                        {booking.status}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </>
          )}

          {/* ── Calendar view ── */}
          {activeView === "calendar" && (
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
          {activeView === "statistics" && (
            <BookingStatistics
              allBookings={allBookings}
              professionalNameMap={professionalNameMap}
              tenantId={tenant?.id ?? ""}
            />
          )}

        </Box>
      </Box>

      {/* Booking Details Dialog */}
      <Dialog
        open={showBookingDialog}
        onClose={() => setShowBookingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && userProfile && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom color="primary">
                Customer Information
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>Name:</strong> {userProfile.full_name}
                </Typography>
                <Typography variant="body1">
                  <strong>Email:</strong> {userProfile.email}
                </Typography>
                <Typography variant="body1">
                  <strong>Phone:</strong> {userProfile.phone}
                </Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom color="primary">
                Appointment Details
              </Typography>
              <Typography variant="body1">
                <strong>Date:</strong>{" "}
                {dayjs(selectedBooking.date).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body1">
                <strong>Professional:</strong>{" "}
                {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
              <Typography variant="body1">
                <strong>Location:</strong>{" "}
                {selectedBooking.location === "your_place"
                  ? "At Customer Place"
                  : "At Our Place"}
              </Typography>
              <Typography variant="body1">
                <strong>Services:</strong>{" "}
                {getServiceNames(selectedBooking.services)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                <strong>Status:</strong>
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
                  {selectedBooking.status.toUpperCase()}
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
                  alert("Error updating status: " + (await res.text()));
                } else {
                  alert("✅ Booking force-confirmed by owner!");
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="success"
              sx={{ mr: 1 }}
            >
              Force Confirm
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
                  alert("Error reopening booking: " + (await res.text()));
                } else {
                  alert("🔄 Booking reopened — customer can confirm again");
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="warning"
              sx={{ mr: 1 }}
            >
              Reopen Booking
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
                  alert("Error updating status: " + (await res.text()));
                } else {
                  alert("Booking status changed to pending");
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="outlined"
              color="warning"
              sx={{ mr: 1 }}
            >
              Set to Pending
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
                  alert("Error updating status: " + (await res.text()));
                } else {
                  alert("✔️ Booking marked as completed");
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="contained"
              color="secondary"
              sx={{ mr: 1 }}
            >
              Mark Completed
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
                Cancel Booking
              </Button>
            )}
          {selectedBooking && (
            <Button
              onClick={() => setShowDeleteConfirmDialog(true)}
              variant="contained"
              color="error"
              sx={{ mr: 1 }}
            >
              Delete Booking
            </Button>
          )}
          <Button
            onClick={() => setShowBookingDialog(false)}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* New Booking Dialog */}
      <Dialog open={showNewBookingDialog} onClose={() => setShowNewBookingDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Booking</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Date</Typography>
              <Box component="input" type="date" value={newBookingDate}
                onChange={e => setNewBookingDate(e.target.value)}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Start Time</Typography>
                <Box component="input" type="time" value={newBookingStartTime}
                  onChange={e => setNewBookingStartTime(e.target.value)}
                  sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">End Time</Typography>
                <Box component="input" type="time" value={newBookingEndTime}
                  onChange={e => setNewBookingEndTime(e.target.value)}
                  sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
                />
              </Box>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Professional</Typography>
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
              <Typography variant="caption" color="text.secondary">Services (hold Ctrl/Cmd to select multiple)</Typography>
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
              <Typography variant="caption" color="text.secondary">Client</Typography>
              <Box component="select" value={newBookingUserId}
                onChange={e => setNewBookingUserId(e.target.value)}
                sx={{ display: "block", width: "100%", mt: 0.5, p: 1, borderRadius: 1, border: `1px solid ${colors.border.main}`, background: colors.background.card, color: colors.text.primary, fontSize: 14 }}
              >
                <option value="">— select client —</option>
                {Object.entries(userNameMap).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewBookingDialog(false)} variant="outlined">Cancel</Button>
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
                alert("Error creating booking: " + (await res.text()));
              } else {
                await loadBookings();
                setShowNewBookingDialog(false);
              }
            }}
          >
            Create Booking
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
        <DialogTitle>Cancel Booking?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to cancel this booking? This will change the
            booking status to "cancelled".
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
                <strong>Booking Date:</strong>{" "}
                {dayjs(selectedBooking.date).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>Professional:</strong>{" "}
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
            No, Keep It
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
                  alert("Error cancelling booking: " + (await res.text()));
                } else {
                  alert("❌ Booking cancelled");
                  await loadBookings();
                  setShowCancelConfirmDialog(false);
                  setShowBookingDialog(false);
                }
              }
            }}
            variant="contained"
            color="error"
          >
            Yes, Cancel Booking
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
          ⚠️ Delete Booking Permanently?
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body1"
            sx={{ color: colors.error.main, fontWeight: "bold", mb: 2 }}
          >
            WARNING: This action cannot be undone!
          </Typography>
          <Typography variant="body1">
            Are you sure you want to permanently delete this booking from the
            database? All booking information will be lost.
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
                <strong>Booking Date:</strong>{" "}
                {dayjs(selectedBooking.date).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>Professional:</strong>{" "}
                {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                <strong>Status:</strong> {selectedBooking.status}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setShowDeleteConfirmDialog(false)}
            variant="contained"
          >
            No, Keep It
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
                  alert("Error deleting booking: " + (await res.text()));
                } else {
                  alert("🗑️ Booking permanently deleted");
                  await loadBookings();
                  setShowDeleteConfirmDialog(false);
                  setShowBookingDialog(false);
                }
              }
            }}
            variant="contained"
            color="error"
          >
            Yes, Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
