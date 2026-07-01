import { useEffect, useMemo, useState } from "react";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
import { supabase } from "../components/supabaseClient";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { toggleTheme } from "../../slices/themeSlice";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PendingIcon from "@mui/icons-material/Pending";
import CancelIcon from "@mui/icons-material/Cancel";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import dayjs from "dayjs";
import BookingStatistics from "../components/BookingStatistics";
import { fetchProfessionals } from "../components/professionalsService";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "expired";

interface Booking {
  id: string;
  date: string;
  user_id: string;
  professional_id: string;
  location: string;
  services: string;
  status: BookingStatus;
  created_at: string;
  start_time: string;
  end_time: string;
  confirmed_at?: string | null;
}

interface UserProfile {
  full_name: string;
  phone: string;
  email: string;
}

interface ProfessionalHour {
  id?: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  tenant_id?: string;
}

interface ServiceMapItem {
  id: string;
  name: string;
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string; label: string }> = {
  confirmed: { bg: "#2e7d32", color: "#fff", label: "Confirmed" },
  pending: { bg: "#ed6c02", color: "#fff", label: "Pending" },
  cancelled: { bg: "#f44336", color: "#fff", label: "Cancelled" },
  completed: { bg: "#6366f1", color: "#fff", label: "Completed" },
  expired: { bg: "#78716c", color: "#fff", label: "Expired" },
};

export default function ProfessionalPanel() {
  const dispatch = useDispatch();
  const colors = useResolvedColors();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const { tenant } = useTenantContext();

  const [tab, setTab] = useState(0);
  const [professionalCode, setProfessionalCode] = useState<string | null>(null);
  const [professionalName, setProfessionalName] = useState<string>("Professional");
  const [loadingIdentity, setLoadingIdentity] = useState(true);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showActionConfirmDialog, setShowActionConfirmDialog] = useState<{
    open: boolean;
    action: "confirm" | "cancel" | "complete" | "delete" | null;
  }>({ open: false, action: null });

  const [professionalHours, setProfessionalHours] = useState<ProfessionalHour[]>([]);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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

  const loadIdentity = async () => {
    setLoadingIdentity(true);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const code = session?.user?.user_metadata?.professional_code;
      if (!code || typeof code !== "string") {
        setProfessionalCode(null);
        return;
      }
      setProfessionalCode(code);
      const fullName =
        (session?.user?.user_metadata?.full_name as string | undefined) ??
        session?.user?.email ??
        "Professional";
      setProfessionalName(fullName);
    } catch (err) {
      console.error("[ProfessionalPanel] Error loading identity:", err);
      setProfessionalCode(null);
    } finally {
      setLoadingIdentity(false);
    }
  };

  const loadServiceMap = async () => {
    if (!tenant?.id) return;
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/services?tenant_id=eq.${tenant.id}&select=id,name`,
        { headers },
      );
      if (!response.ok) return;
      const data = (await response.json()) as ServiceMapItem[];
      const map: Record<string, string> = {};
      data.forEach((s) => { map[s.id] = s.name; });
      setServiceMap(map);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading service map:", err);
    }
  };

  const loadBookings = async () => {
    if (!tenant?.id || !professionalCode) return;
    setLoadingData(true);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookings?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}&select=*&order=date.desc,start_time.desc`,
        { headers },
      );
      if (!response.ok) { setBookings([]); return; }
      setBookings((await response.json()) as Booking[]);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading bookings:", err);
      setBookings([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadProfessionalHours = async () => {
    if (!tenant?.id || !professionalCode) return;
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/professional_hours?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}&select=*&order=day_of_week`,
        { headers },
      );
      if (!response.ok) { setProfessionalHours([]); return; }
      setProfessionalHours((await response.json()) as ProfessionalHour[]);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading hours:", err);
    }
  };

  useEffect(() => { loadIdentity(); }, []);

  // professionals.name is the single source of truth for display name;
  // auth user_metadata.full_name is only a fallback until it loads.
  useEffect(() => {
    if (!professionalCode || !tenant?.id) return;
    fetchProfessionals(tenant.id).then((professionals) => {
      const match = professionals.find((p) => p.code === professionalCode);
      if (match?.name) setProfessionalName(match.name);
    });
  }, [professionalCode, tenant?.id]);

  useEffect(() => {
    if (!professionalCode || !tenant?.id) return;
    loadBookings();
    loadProfessionalHours();
    loadServiceMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalCode, tenant?.id]);

  const loadUserProfile = async (userId: string) => {
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=full_name,phone,email&limit=1`,
        { headers },
      );
      if (!response.ok) return;
      const data = await response.json();
      const p = data?.[0];
      setUserProfile(p
        ? { full_name: p.full_name || "N/A", phone: p.phone || "N/A", email: p.email || "N/A" }
        : { full_name: "N/A", phone: "N/A", email: "N/A" }
      );
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading profile:", err);
    }
  };

  const selectedBookings = useMemo(
    () => bookings.filter((b) => b.professional_id === professionalCode),
    [bookings, professionalCode],
  );

  const upcomingBookings = useMemo(
    () => selectedBookings.filter((b) => b.date >= today),
    [selectedBookings, today],
  );

  const stats = useMemo(() => ({
    total: selectedBookings.length,
    confirmed: selectedBookings.filter((b) => b.status === "confirmed").length,
    pending: selectedBookings.filter((b) => b.status === "pending").length,
    cancelled: selectedBookings.filter((b) => b.status === "cancelled").length,
    completed: selectedBookings.filter((b) => b.status === "completed").length,
    upcoming: upcomingBookings.length,
  }), [selectedBookings, upcomingBookings]);

  const getServiceNames = (servicesJson: string) => {
    try {
      const parsed = JSON.parse(servicesJson);
      const ids: string[] = Array.isArray(parsed) ? parsed : [parsed];
      return ids.map((id) => serviceMap[id] || id).join(", ");
    } catch {
      return serviceMap[servicesJson] || servicesJson;
    }
  };

  const setHourValue = (dayOfWeek: number, field: "start_time" | "end_time", value: string) => {
    setProfessionalHours((prev) => {
      const idx = prev.findIndex((h) => h.day_of_week === dayOfWeek);
      if (idx === -1) {
        return [...prev, {
          professional_id: professionalCode ?? "",
          day_of_week: dayOfWeek,
          start_time: field === "start_time" ? value : "09:00",
          end_time: field === "end_time" ? value : "17:00",
        }].sort((a, b) => a.day_of_week - b.day_of_week);
      }
      return prev
        .map((h) => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h)
        .sort((a, b) => a.day_of_week - b.day_of_week);
    });
  };

  const addWorkingDay = (dayOfWeek: number) => {
    if (!professionalCode) return;
    setProfessionalHours((prev) => {
      if (prev.some((h) => h.day_of_week === dayOfWeek)) return prev;
      return [...prev, {
        professional_id: professionalCode,
        day_of_week: dayOfWeek,
        start_time: "09:00",
        end_time: "17:00",
      }].sort((a, b) => a.day_of_week - b.day_of_week);
    });
  };

  const removeWorkingDay = (dayOfWeek: number) => {
    setProfessionalHours((prev) => prev.filter((h) => h.day_of_week !== dayOfWeek));
  };

  const saveProfessionalHours = async () => {
    if (!tenant?.id || !professionalCode) return;
    const headers = await getAuthHeaders();
    if (!headers) return;
    try {
      const rows = professionalHours.filter((h) => h.professional_id === professionalCode);
      const del = await fetch(
        `${supabaseUrl}/rest/v1/professional_hours?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
        { method: "DELETE", headers },
      );
      if (!del.ok) { alert("Error clearing old hours: " + (await del.text())); return; }
      if (rows.length > 0) {
        const ins = await fetch(`${supabaseUrl}/rest/v1/professional_hours`, {
          method: "POST",
          headers: { ...headers, Prefer: "return=representation" },
          body: JSON.stringify(rows.map((h) => ({
            professional_id: professionalCode,
            day_of_week: h.day_of_week,
            start_time: h.start_time,
            end_time: h.end_time,
            tenant_id: tenant.id,
          }))),
        });
        if (!ins.ok) { alert("Error saving hours: " + (await ins.text())); return; }
      }
      alert("Working hours saved successfully");
      await loadProfessionalHours();
    } catch (err) {
      console.error("[ProfessionalPanel] Error saving hours:", err);
      alert("Unexpected error while saving hours");
    }
  };

  const openBookingDialog = async (booking: Booking) => {
    setSelectedBooking(booking);
    await loadUserProfile(booking.user_id);
    setShowBookingDialog(true);
  };

  const patchBookingStatus = async (bookingId: string, payload: Record<string, unknown>) => {
    const headers = await getAuthHeaders();
    if (!headers || !tenant?.id || !professionalCode) return false;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
      { method: "PATCH", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(payload) },
    );
    if (!response.ok) { alert("Error updating booking: " + (await response.text())); return false; }
    await loadBookings();
    return true;
  };

  const handleConfirmBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, { status: "confirmed", confirmed_at: new Date().toISOString() });
    if (ok) { setShowBookingDialog(false); }
  };

  const handleDeclineBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, { status: "cancelled" });
    if (ok) { setShowBookingDialog(false); }
  };

  const handleCompleteBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, { status: "completed" });
    if (ok) { setShowBookingDialog(false); }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking || !tenant?.id || !professionalCode) return;
    const headers = await getAuthHeaders();
    if (!headers) return;
    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}&tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
      { method: "DELETE", headers },
    );
    if (!response.ok) { alert("Error deleting booking: " + (await response.text())); return; }
    await loadBookings();
    setShowBookingDialog(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loadingIdentity) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: colors.background.light }}>
        <Typography sx={{ color: colors.text.secondary }}>Loading your dashboard...</Typography>
      </Box>
    );
  }

  const cardSx = {
    backgroundColor: colors.background.medium,
    borderRadius: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
    p: 2.5,
  };

  const initials = professionalName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Box sx={{ minHeight: "100vh", width: "100vw", backgroundColor: colors.background.light }}>
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          py: 1.5,
          backgroundColor: colors.background.medium,
          borderBottom: `1px solid ${colors.border.main}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ bgcolor: colors.primary.main, width: 40, height: 40, fontSize: 14, fontWeight: 700 }}>
            {initials}
          </Avatar>
          <Box>
            <Typography sx={{ color: colors.text.primary, fontWeight: 700, lineHeight: 1.2, fontSize: 15 }}>
              {professionalName}
            </Typography>
            {professionalCode && (
              <Typography sx={{ color: colors.text.secondary, fontSize: 12 }}>
                Code: {professionalCode}
              </Typography>
            )}
          </Box>
        </Box>

        <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700, display: { xs: "none", sm: "block" } }}>
          Professional Dashboard
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={() => dispatch(toggleTheme())}
            sx={{ color: colors.text.primary, backgroundColor: colors.background.light, width: 38, height: 38 }}
            aria-label="Toggle theme"
          >
            {mode === "dark" ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </IconButton>
          <Button
            onClick={handleLogout}
            variant="outlined"
            size="small"
            sx={{ borderRadius: "20px", borderColor: colors.error.main, color: colors.error.main, fontWeight: 600, textTransform: "none" }}
          >
            Logout
          </Button>
        </Box>
      </Box>

      {/* Stats row */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, pt: 3, pb: 1 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(6, 1fr)" }, gap: 1.5 }}>
          {[
            { label: "Total", value: stats.total, icon: <TrendingUpIcon />, color: colors.primary.main },
            { label: "Upcoming", value: stats.upcoming, icon: <EventAvailableIcon />, color: "#2e7d32" },
            { label: "Confirmed", value: stats.confirmed, icon: <CheckCircleIcon />, color: "#2e7d32" },
            { label: "Pending", value: stats.pending, icon: <PendingIcon />, color: "#ed6c02" },
            { label: "Completed", value: stats.completed, icon: <CalendarMonthIcon />, color: "#6366f1" },
            { label: "Cancelled", value: stats.cancelled, icon: <CancelIcon />, color: "#f44336" },
          ].map(({ label, value, icon, color }) => (
            <Box key={label} sx={{ ...cardSx, display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5, p: 2 }}>
              <Box sx={{ color, display: "flex" }}>{icon}</Box>
              <Typography sx={{ color: colors.text.primary, fontWeight: 700, fontSize: 22, lineHeight: 1 }}>
                {value}
              </Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 12 }}>{label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, mt: 2, borderBottom: `1px solid ${colors.border.main}` }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="My Stats" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="My Bookings" sx={{ textTransform: "none", fontWeight: 600 }} />
          <Tab label="My Schedule" sx={{ textTransform: "none", fontWeight: 600 }} />
        </Tabs>
      </Box>

      <Box sx={{ maxWidth: 1200, mx: "auto", px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Stats tab */}
        {tab === 0 && (
          <BookingStatistics
            allBookings={selectedBookings}
            professionalNameMap={professionalCode ? { [professionalCode]: professionalName } : {}}
            tenantId={tenant?.id ?? ""}
          />
        )}

        {/* Bookings tab */}
        {tab === 1 && (
          <Box>
            <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700, mb: 2 }}>
              My Bookings
            </Typography>
            {loadingData && (
              <Typography sx={{ color: colors.text.secondary, mb: 2 }}>Loading bookings...</Typography>
            )}
            {!loadingData && selectedBookings.length === 0 && (
              <Box sx={{ ...cardSx, textAlign: "center", py: 5 }}>
                <CalendarMonthIcon sx={{ fontSize: 48, color: colors.text.secondary, mb: 1 }} />
                <Typography sx={{ color: colors.text.secondary }}>No bookings assigned to you yet.</Typography>
              </Box>
            )}
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {selectedBookings.map((booking) => {
                const s = STATUS_COLORS[booking.status] ?? STATUS_COLORS.expired;
                return (
                  <Box
                    key={booking.id}
                    sx={{
                      ...cardSx,
                      display: "flex",
                      alignItems: { xs: "flex-start", sm: "center" },
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      border: `1px solid ${colors.border.main}`,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                        <Typography sx={{ color: colors.text.primary, fontWeight: 700, fontSize: 15 }}>
                          {dayjs(booking.date).format("MMM DD, YYYY")}
                        </Typography>
                        <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>
                          {booking.start_time?.substring(0, 5)} – {booking.end_time?.substring(0, 5)}
                        </Typography>
                        <Chip
                          label={s.label}
                          size="small"
                          sx={{ backgroundColor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, height: 22, borderRadius: "9999px" }}
                        />
                      </Box>
                      <Typography sx={{ color: colors.text.secondary, fontSize: 13 }}>
                        {getServiceNames(booking.services)} · {booking.location === "your_place" ? "At Customer Place" : "At Our Place"}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => openBookingDialog(booking)}
                      sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600, whiteSpace: "nowrap" }}
                    >
                      View Details
                    </Button>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Schedule tab */}
        {tab === 2 && (
          <Box>
            <Typography variant="h6" sx={{ color: colors.text.primary, fontWeight: 700, mb: 0.5 }}>
              My Weekly Schedule
            </Typography>
            <Typography sx={{ color: colors.text.secondary, fontSize: 14, mb: 2 }}>
              Set your working hours for each day of the week.
            </Typography>

            <Box sx={{ display: "grid", gap: 1.5 }}>
              {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
                const existing = professionalHours.find((h) => h.day_of_week === dayOfWeek);
                return (
                  <Box
                    key={dayOfWeek}
                    sx={{
                      ...cardSx,
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      flexWrap: "wrap",
                      border: `1px solid ${existing ? colors.primary.main + "60" : colors.border.main}`,
                    }}
                  >
                    <Typography sx={{ color: colors.text.primary, fontWeight: 600, width: 90, flexShrink: 0 }}>
                      {DAY_NAMES[dayOfWeek]}
                    </Typography>
                    {existing ? (
                      <>
                        <TextField
                          label="Start"
                          type="time"
                          value={existing.start_time}
                          onChange={(e) => setHourValue(dayOfWeek, "start_time", e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          sx={{ width: 130 }}
                        />
                        <TextField
                          label="End"
                          type="time"
                          value={existing.end_time}
                          onChange={(e) => setHourValue(dayOfWeek, "end_time", e.target.value)}
                          InputLabelProps={{ shrink: true }}
                          size="small"
                          sx={{ width: 130 }}
                        />
                        <Button
                          color="error"
                          variant="outlined"
                          size="small"
                          onClick={() => removeWorkingDay(dayOfWeek)}
                          sx={{ borderRadius: "20px", textTransform: "none", ml: "auto" }}
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => addWorkingDay(dayOfWeek)}
                        sx={{ borderRadius: "20px", textTransform: "none" }}
                      >
                        Add hours
                      </Button>
                    )}
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
              <Button
                variant="contained"
                onClick={saveProfessionalHours}
                sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600, px: 4 }}
              >
                Save Schedule
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Booking detail dialog */}
      <Dialog open={showBookingDialog} onClose={() => setShowBookingDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: "15px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Booking Details</DialogTitle>
        <DialogContent>
          {selectedBooking && userProfile && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>
                Customer
              </Typography>
              <Typography><strong>{userProfile.full_name}</strong></Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>{userProfile.email}</Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>{userProfile.phone}</Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ color: colors.text.secondary, mb: 1, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>
                Appointment
              </Typography>
              <Typography><strong>{dayjs(selectedBooking.date).format("MMMM DD, YYYY")}</strong></Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>
                {selectedBooking.start_time?.substring(0, 5)} – {selectedBooking.end_time?.substring(0, 5)}
              </Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>
                {selectedBooking.location === "your_place" ? "At Customer Place" : "At Our Place"}
              </Typography>
              <Typography sx={{ color: colors.text.secondary, fontSize: 14 }}>
                {getServiceNames(selectedBooking.services)}
              </Typography>
              <Box sx={{ mt: 1.5 }}>
                <Chip
                  label={STATUS_COLORS[selectedBooking.status]?.label ?? selectedBooking.status}
                  sx={{
                    backgroundColor: STATUS_COLORS[selectedBooking.status]?.bg ?? "#78716c",
                    color: "#fff",
                    fontWeight: 600,
                    borderRadius: "9999px",
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1, flexWrap: "wrap" }}>
          {selectedBooking?.status === "pending" && (
            <Button onClick={() => setShowActionConfirmDialog({ open: true, action: "confirm" })}
              variant="contained" color="success" size="small"
              sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600 }}>
              Confirm
            </Button>
          )}
          {selectedBooking && !["cancelled", "completed"].includes(selectedBooking.status) && (
            <Button onClick={() => setShowActionConfirmDialog({ open: true, action: "cancel" })}
              variant="outlined" color="warning" size="small"
              sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600 }}>
              Decline
            </Button>
          )}
          {selectedBooking?.status === "confirmed" && (
            <Button onClick={() => setShowActionConfirmDialog({ open: true, action: "complete" })}
              variant="contained" color="secondary" size="small"
              sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600 }}>
              Mark Completed
            </Button>
          )}
          <Button onClick={() => setShowActionConfirmDialog({ open: true, action: "delete" })}
            variant="outlined" color="error" size="small"
            sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600, ml: "auto" }}>
            Delete
          </Button>
          <Button onClick={() => setShowBookingDialog(false)} variant="outlined" size="small"
            sx={{ borderRadius: "20px", textTransform: "none" }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Action confirm dialog */}
      <Dialog open={showActionConfirmDialog.open}
        onClose={() => setShowActionConfirmDialog({ open: false, action: null })}
        maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: "15px" } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Action</DialogTitle>
        <DialogContent>
          <Typography>
            {showActionConfirmDialog.action === "confirm" && "Confirm this pending booking?"}
            {showActionConfirmDialog.action === "cancel" && "Decline / cancel this booking?"}
            {showActionConfirmDialog.action === "complete" && "Mark this booking as completed?"}
            {showActionConfirmDialog.action === "delete" && "Permanently delete this booking? This cannot be undone."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setShowActionConfirmDialog({ open: false, action: null })}
            variant="outlined" sx={{ borderRadius: "20px", textTransform: "none" }}>
            No
          </Button>
          <Button
            onClick={async () => {
              const action = showActionConfirmDialog.action;
              setShowActionConfirmDialog({ open: false, action: null });
              if (action === "confirm") await handleConfirmBooking();
              else if (action === "cancel") await handleDeclineBooking();
              else if (action === "complete") await handleCompleteBooking();
              else if (action === "delete") await handleDeleteBooking();
            }}
            variant="contained" color="error" sx={{ borderRadius: "20px", textTransform: "none", fontWeight: 600 }}>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
