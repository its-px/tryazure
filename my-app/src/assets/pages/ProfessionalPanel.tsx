import { useEffect, useMemo, useState } from "react";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
import { supabase } from "../components/supabaseClient";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { toggleTheme } from "../../slices/themeSlice";
import {
  Box,
  Button,
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
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import BookingStatistics from "../components/BookingStatistics";

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

export default function ProfessionalPanel() {
  const dispatch = useDispatch();
  const colors = useResolvedColors();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const { tenant } = useTenantContext();

  const [tab, setTab] = useState(0);
  const [professionalCode, setProfessionalCode] = useState<string | null>(null);
  const [professionalName, setProfessionalName] =
    useState<string>("Professional");
  const [loadingIdentity, setLoadingIdentity] = useState(true);
  

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showActionConfirmDialog, setShowActionConfirmDialog] = useState<{
    open: boolean;
    action: "confirm" | "cancel" | "complete" | "delete" | null;
  }>({ open: false, action: null });

  const [professionalHours, setProfessionalHours] = useState<
    ProfessionalHour[]
  >([]);
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
    // clear any previous identity state; errors are logged instead

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const code = session?.user?.user_metadata?.professional_code;

      if (!code || typeof code !== "string") {
        setProfessionalCode(null);
        console.warn(
          "[ProfessionalPanel] account not linked to a professional code",
        );
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

    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/services?tenant_id=eq.${tenant.id}&select=id,name`,
        { headers },
      );

      if (!response.ok) {
        console.error(
          "[ProfessionalPanel] Error loading service map:",
          response.statusText,
        );
        return;
      }

      const data = (await response.json()) as ServiceMapItem[];
      const map: Record<string, string> = {};
      data.forEach((service) => {
        map[service.id] = service.name;
      });
      setServiceMap(map);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading service map:", err);
    }
  };

  const loadBookings = async () => {
    if (!tenant?.id || !professionalCode) return;

    try {
      setLoadingData(true);
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookings?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}&select=*&order=date.desc,start_time.desc`,
        { headers },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ProfessionalPanel] Booking load error:", errorText);
        setBookings([]);
        return;
      }

      const data = (await response.json()) as Booking[];
      setBookings(data);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading bookings:", err);
      setBookings([]);
    } finally {
      setLoadingData(false);
    }
  };

  const loadProfessionalHours = async () => {
    if (!tenant?.id || !professionalCode) return;

    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/professional_hours?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}&select=*&order=day_of_week`,
        { headers },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ProfessionalPanel] Hours load error:", errorText);
        setProfessionalHours([]);
        return;
      }

      const data = (await response.json()) as ProfessionalHour[];
      setProfessionalHours(data);
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading hours:", err);
      setProfessionalHours([]);
    }
  };

  useEffect(() => {
    loadIdentity();
  }, []);

  useEffect(() => {
    if (!professionalCode || !tenant?.id) return;
    loadBookings();
    loadProfessionalHours();
    loadServiceMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalCode, tenant?.id]);

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
        setUserProfile({ full_name: "N/A", phone: "N/A", email: "N/A" });
      }
    } catch (err) {
      console.error("[ProfessionalPanel] Exception loading profile:", err);
    }
  };

  const selectedBookings = useMemo(
    () =>
      bookings.filter(
        (booking) => booking.professional_id === professionalCode,
      ),
    [bookings, professionalCode],
  );

  const upcomingBookings = useMemo(
    () => selectedBookings.filter((booking) => booking.date >= today),
    [selectedBookings, today],
  );

  const statsByStatus = useMemo(
    () => ({
      total: selectedBookings.length,
      confirmed: selectedBookings.filter((b) => b.status === "confirmed")
        .length,
      pending: selectedBookings.filter((b) => b.status === "pending").length,
      cancelled: selectedBookings.filter((b) => b.status === "cancelled")
        .length,
      completed: selectedBookings.filter((b) => b.status === "completed")
        .length,
    }),
    [selectedBookings],
  );

  const getServiceNames = (servicesJson: string) => {
    try {
      const ids = JSON.parse(servicesJson) as string[];
      return ids.map((id) => serviceMap[id] || id).join(", ");
    } catch {
      return servicesJson;
    }
  };

  const getDayName = (dayOfWeek: number) =>
    DAY_NAMES[dayOfWeek] ?? `Day ${dayOfWeek}`;

  const setHourValue = (
    dayOfWeek: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setProfessionalHours((prev) => {
      const existingIndex = prev.findIndex(
        (hour) => hour.day_of_week === dayOfWeek,
      );
      if (existingIndex === -1) {
        return [
          ...prev,
          {
            professional_id: professionalCode ?? "",
            day_of_week: dayOfWeek,
            start_time: field === "start_time" ? value : "09:00",
            end_time: field === "end_time" ? value : "17:00",
          },
        ].sort((a, b) => a.day_of_week - b.day_of_week);
      }

      return prev
        .map((hour) =>
          hour.day_of_week === dayOfWeek ? { ...hour, [field]: value } : hour,
        )
        .sort((a, b) => a.day_of_week - b.day_of_week);
    });
  };

  const addWorkingDay = (dayOfWeek: number) => {
    if (!professionalCode) return;
    setProfessionalHours((prev) => {
      if (prev.some((hour) => hour.day_of_week === dayOfWeek)) return prev;
      return [
        ...prev,
        {
          professional_id: professionalCode,
          day_of_week: dayOfWeek,
          start_time: "09:00",
          end_time: "17:00",
        },
      ].sort((a, b) => a.day_of_week - b.day_of_week);
    });
  };

  const removeWorkingDay = (dayOfWeek: number) => {
    setProfessionalHours((prev) =>
      prev.filter((hour) => hour.day_of_week !== dayOfWeek),
    );
  };

  const saveProfessionalHours = async () => {
    if (!tenant?.id || !professionalCode) return;

    const headers = await getAuthHeaders();
    if (!headers) return;

    try {
      const currentRows = professionalHours.filter(
        (hour) => hour.professional_id === professionalCode,
      );

      const deleteResponse = await fetch(
        `${supabaseUrl}/rest/v1/professional_hours?tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
        { method: "DELETE", headers },
      );

      if (!deleteResponse.ok) {
        alert("Error clearing old hours: " + (await deleteResponse.text()));
        return;
      }

      if (currentRows.length > 0) {
        const insertResponse = await fetch(
          `${supabaseUrl}/rest/v1/professional_hours`,
          {
            method: "POST",
            headers: { ...headers, Prefer: "return=representation" },
            body: JSON.stringify(
              currentRows.map((hour) => ({
                professional_id: professionalCode,
                day_of_week: hour.day_of_week,
                start_time: hour.start_time,
                end_time: hour.end_time,
                tenant_id: tenant.id,
              })),
            ),
          },
        );

        if (!insertResponse.ok) {
          alert("Error saving working hours: " + (await insertResponse.text()));
          return;
        }
      }

      alert("✅ Your working hours were saved successfully");
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

  const patchBookingStatus = async (
    bookingId: string,
    payload: Record<string, unknown>,
  ) => {
    const headers = await getAuthHeaders();
    if (!headers || !tenant?.id || !professionalCode) return false;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${bookingId}&tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
      {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      alert("Error updating booking: " + (await response.text()));
      return false;
    }

    await loadBookings();
    return true;
  };

  const handleConfirmBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, {
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    });
    if (ok) {
      alert("✅ Booking confirmed");
      setShowBookingDialog(false);
    }
  };

  const handleDeclineBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, {
      status: "cancelled",
    });
    if (ok) {
      alert("❌ Booking declined/cancelled");
      setShowBookingDialog(false);
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedBooking) return;
    const ok = await patchBookingStatus(selectedBooking.id, {
      status: "completed",
    });
    if (ok) {
      alert("✔️ Booking marked as completed");
      setShowBookingDialog(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking || !tenant?.id || !professionalCode) return;

    const headers = await getAuthHeaders();
    if (!headers) return;

    const response = await fetch(
      `${supabaseUrl}/rest/v1/bookings?id=eq.${selectedBooking.id}&tenant_id=eq.${tenant.id}&professional_id=eq.${professionalCode}`,
      { method: "DELETE", headers },
    );

    if (!response.ok) {
      alert("Error deleting booking: " + (await response.text()));
      return;
    }

    alert("🗑️ Booking deleted");
    await loadBookings();
    setShowBookingDialog(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingIdentity) {
    return <div style={{ padding: 24 }}>Loading your dashboard...</div>;
  }

  // if (identityError || !professionalCode) {
  //   return (
  //     <Box
  //       sx={{
  //         minHeight: "100vh",
  //         width: "100vw",
  //         display: "flex",
  //         alignItems: "center",
  //         justifyContent: "center",
  //         p: 3,
  //         backgroundColor: colors.background.light,
  //       }}
  //     >
  //       <Box sx={{ maxWidth: 720, width: "100%", p: 4, borderRadius: 3, backgroundColor: colors.background.medium }}>
  //         <Typography variant="h4" sx={{ mb: 2, color: colors.text.primary }}>
  //           Professional Access Not Ready
  //         </Typography>
  //         <Typography sx={{ color: colors.text.secondary, mb: 3 }}>
  //           {identityError ?? "Your account does not have a professional code yet."}
  //         </Typography>
  //         <Button component={Link} to="/" variant="contained">
  //           Go Back
  //         </Button>
  //       </Box>
  //     </Box>
  //   );
  // }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: colors.background.light,
        p: 3,
      }}
    >
      <Typography
        variant="h4"
        sx={{ textAlign: "center", color: colors.text.primary, mb: 1 }}
      >
        Professional Dashboard
      </Typography>
      <Typography
        sx={{ textAlign: "center", color: colors.text.secondary, mb: 3 }}
      >
        {professionalName} · {professionalCode}
      </Typography>

      <Link
        to="/professional"
        style={{ display: "block", textAlign: "center", marginBottom: 20 }}
      >
        Professional Dashboard
      </Link>

      <IconButton
        onClick={() => dispatch(toggleTheme())}
        sx={{
          position: "absolute",
          top: 20,
          right: 100,
          color: colors.text.primary,
          backgroundColor: colors.background.medium,
          "&:hover": { backgroundColor: colors.background.light },
          width: 40,
          height: 40,
          zIndex: 1000,
        }}
        aria-label={
          mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
      >
        {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>

      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 20px",
          backgroundColor: colors.error.main,
          color: "white",
          border: "none",
          borderRadius: 5,
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        Logout
      </button>

      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Tabs value={tab} onChange={(_, value) => setTab(value)} centered>
          <Tab label="My Stats" />
          <Tab label="My Bookings" />
          <Tab label="My Schedule" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <Box sx={{ maxWidth: 1200, mx: "auto", mt: 3 }}>
          <Box
            sx={{
              mb: 2,
              p: 2,
              borderRadius: 2,
              backgroundColor: colors.background.medium,
            }}
          >
            <Typography variant="h6" sx={{ color: colors.text.primary }}>
              My Booking Summary
            </Typography>
            <Typography sx={{ color: colors.text.secondary }}>
              Total: {statsByStatus.total} · Confirmed:{" "}
              {statsByStatus.confirmed} · Pending: {statsByStatus.pending} ·
              Cancelled: {statsByStatus.cancelled} · Completed:{" "}
              {statsByStatus.completed}
            </Typography>
            <Typography sx={{ color: colors.text.secondary }}>
              Upcoming bookings: {upcomingBookings.length}
            </Typography>
          </Box>
          <BookingStatistics
            allBookings={selectedBookings}
            professionalNameMap={
              professionalCode ? { [professionalCode]: professionalName } : {}
            }
          />
        </Box>
      )}

      {tab === 1 && (
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            mt: 3,
            p: 3,
            borderRadius: 2,
            backgroundColor: colors.background.medium,
          }}
        >
          <Typography variant="h5" sx={{ color: colors.text.primary, mb: 2 }}>
            My Bookings
          </Typography>
          {loadingData && (
            <Typography sx={{ color: colors.text.secondary, mb: 2 }}>
              Loading your bookings...
            </Typography>
          )}
          {selectedBookings.length === 0 ? (
            <Typography sx={{ color: colors.text.secondary }}>
              No bookings assigned to you yet.
            </Typography>
          ) : (
            <Box sx={{ display: "grid", gap: 1.5 }}>
              {selectedBookings.map((booking) => (
                <Box
                  key={booking.id}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: colors.background.light,
                    border: `1px solid ${colors.border.main}`,
                  }}
                >
                  <Typography
                    sx={{ color: colors.text.primary, fontWeight: "bold" }}
                  >
                    {dayjs(booking.date).format("MMMM DD, YYYY")} ·{" "}
                    {booking.start_time?.substring(0, 5) ?? "--:--"} -{" "}
                    {booking.end_time?.substring(0, 5) ?? "--:--"}
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary }}>
                    Status: {booking.status.toUpperCase()} · Location:{" "}
                    {booking.location === "your_place"
                      ? "At Customer Place"
                      : "At Our Place"}
                  </Typography>
                  <Typography sx={{ color: colors.text.secondary }}>
                    Services: {getServiceNames(booking.services)}
                  </Typography>
                  <Button
                    sx={{ mt: 1 }}
                    variant="outlined"
                    onClick={() => openBookingDialog(booking)}
                  >
                    View Details
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      )}

      {tab === 2 && (
        <Box
          sx={{
            maxWidth: 1200,
            mx: "auto",
            mt: 3,
            p: 3,
            borderRadius: 2,
            backgroundColor: colors.background.medium,
          }}
        >
          <Typography variant="h5" sx={{ color: colors.text.primary, mb: 2 }}>
            My Weekly Schedule
          </Typography>
          <Typography sx={{ color: colors.text.secondary, mb: 2 }}>
            Manage only your own weekly hours. These are scoped to your
            professional code and tenant.
          </Typography>

          <Box sx={{ display: "grid", gap: 1.5 }}>
            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const existing = professionalHours.find(
                (hour) => hour.day_of_week === dayOfWeek,
              );
              return (
                <Box
                  key={dayOfWeek}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: colors.background.light,
                    display: "grid",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{ color: colors.text.primary, fontWeight: "bold" }}
                  >
                    {getDayName(dayOfWeek)}
                  </Typography>
                  {existing ? (
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <TextField
                        label="Start"
                        type="time"
                        value={existing.start_time}
                        onChange={(e) =>
                          setHourValue(dayOfWeek, "start_time", e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                      <TextField
                        label="End"
                        type="time"
                        value={existing.end_time}
                        onChange={(e) =>
                          setHourValue(dayOfWeek, "end_time", e.target.value)
                        }
                        InputLabelProps={{ shrink: true }}
                        size="small"
                      />
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => removeWorkingDay(dayOfWeek)}
                      >
                        Remove
                      </Button>
                    </Box>
                  ) : (
                    <Button
                      variant="outlined"
                      onClick={() => addWorkingDay(dayOfWeek)}
                    >
                      Add Working Hours
                    </Button>
                  )}
                </Box>
              );
            })}
          </Box>

          <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
            <Button variant="contained" onClick={saveProfessionalHours}>
              Save My Schedule
            </Button>
          </Box>
        </Box>
      )}

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
              <Typography variant="body1">
                <strong>Name:</strong> {userProfile.full_name}
              </Typography>
              <Typography variant="body1">
                <strong>Email:</strong> {userProfile.email}
              </Typography>
              <Typography variant="body1">
                <strong>Phone:</strong> {userProfile.phone}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom color="primary">
                Appointment Details
              </Typography>
              <Typography variant="body1">
                <strong>Date:</strong>{" "}
                {dayjs(selectedBooking.date).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body1">
                <strong>Time:</strong>{" "}
                {selectedBooking.start_time?.substring(0, 5)} -{" "}
                {selectedBooking.end_time?.substring(0, 5)}
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
                <strong>Status:</strong> {selectedBooking.status.toUpperCase()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedBooking && selectedBooking.status === "pending" && (
            <Button
              onClick={() =>
                setShowActionConfirmDialog({ open: true, action: "confirm" })
              }
              variant="outlined"
              color="success"
              sx={{ mr: 1 }}
            >
              Confirm
            </Button>
          )}
          {selectedBooking &&
            selectedBooking.status !== "cancelled" &&
            selectedBooking.status !== "completed" && (
              <Button
                onClick={() =>
                  setShowActionConfirmDialog({ open: true, action: "cancel" })
                }
                variant="outlined"
                color="warning"
                sx={{ mr: 1 }}
              >
                Decline / Cancel
              </Button>
            )}
          {selectedBooking && selectedBooking.status === "confirmed" && (
            <Button
              onClick={() =>
                setShowActionConfirmDialog({ open: true, action: "complete" })
              }
              variant="contained"
              color="secondary"
              sx={{ mr: 1 }}
            >
              Mark Completed
            </Button>
          )}
          {selectedBooking && (
            <Button
              onClick={() =>
                setShowActionConfirmDialog({ open: true, action: "delete" })
              }
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

      <Dialog
        open={showActionConfirmDialog.open}
        onClose={() =>
          setShowActionConfirmDialog({ open: false, action: null })
        }
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirm Booking Action</DialogTitle>
        <DialogContent>
          <Typography>
            {showActionConfirmDialog.action === "confirm" &&
              "Confirm this pending booking?"}
            {showActionConfirmDialog.action === "cancel" &&
              "Cancel / decline this booking?"}
            {showActionConfirmDialog.action === "complete" &&
              "Mark this booking as completed?"}
            {showActionConfirmDialog.action === "delete" &&
              "Permanently delete this booking? This cannot be undone."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() =>
              setShowActionConfirmDialog({ open: false, action: null })
            }
            variant="outlined"
          >
            No
          </Button>
          <Button
            onClick={async () => {
              if (!selectedBooking || !showActionConfirmDialog.action) return;
              const action = showActionConfirmDialog.action;
              setShowActionConfirmDialog({ open: false, action: null });
              if (action === "confirm") {
                await handleConfirmBooking();
              } else if (action === "cancel") {
                await handleDeclineBooking();
              } else if (action === "complete") {
                await handleCompleteBooking();
              } else if (action === "delete") {
                await handleDeleteBooking();
              }
            }}
            variant="contained"
            color="error"
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
