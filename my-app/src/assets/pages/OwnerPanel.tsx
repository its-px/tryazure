import { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { toggleTheme } from "../../slices/themeSlice";
import { BigCalendar } from "../components/BigCalendar";
import BookingStatistics from "../components/BookingStatistics";
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Divider,
  IconButton,
} from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import { supabase } from "../components/supabaseClient";

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
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedProfessional, setSelectedProfessional] =
    useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [showCancelConfirmDialog, setShowCancelConfirmDialog] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([
    dayjs().format("YYYY-MM-DD"),
  ]);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});

  const today = dayjs().format("YYYY-MM-DD");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const getAuthHeaders = () => {
    const storedSession = localStorage.getItem("sb-auth-token");
    if (!storedSession) return null;
    const parsed = JSON.parse(storedSession);
    if (!parsed?.access_token) return null;
    return {
      apikey: supabaseKey,
      Authorization: `Bearer ${parsed.access_token}`,
      "Content-Type": "application/json",
    };
  };

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      if (!isMounted) return;
      await loadBookings();
      await loadServiceMap();
    };
    loadData();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBookings = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers) {
        console.error("[OwnerPanel] No auth token found in localStorage");
        return;
      }
      console.log("[OwnerPanel] Loading bookings via REST API...");
      const response = await fetch(
        `${supabaseUrl}/rest/v1/bookings?select=*&order=date.desc`,
        { headers },
      );
      if (!response.ok) {
        const text = await response.text();
        console.error(
          "[OwnerPanel] Bookings fetch error:",
          response.status,
          text,
        );
        return;
      }
      const data = await response.json();
      console.log(`[OwnerPanel] Loaded ${data.length} bookings`);
      setAllBookings(data);
    } catch (err) {
      console.error("[OwnerPanel] Exception loading bookings:", err);
    }
  };

  const loadServiceMap = async () => {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/services?select=id,name`,
        {
          headers: {
            apikey: supabaseKey,
            "Content-Type": "application/json",
          },
        },
      );
      if (!response.ok) return;
      const data = await response.json();
      const map: Record<string, string> = {};
      data.forEach((s: { id: string; name: string }) => {
        map[s.id] = s.name;
      });
      setServiceMap(map);
    } catch (err) {
      console.error("[OwnerPanel] Exception loading services:", err);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      const headers = getAuthHeaders();
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

  const handleDayClick = async (dateStr: string) => {
    const booking = filteredBookings.find((b) => b.date === dateStr);

    if (booking) {
      setSelectedBooking(booking);
      await loadUserProfile(booking.user_id);
      setShowBookingDialog(true);
    }
  };

  const handleProfessionalChange = (
    _event: React.MouseEvent<HTMLElement>,
    newProfessional: string | null,
  ) => {
    if (newProfessional !== null) {
      setSelectedProfessional(newProfessional);
    }
  };

  const filteredBookings =
    selectedProfessional === "all"
      ? allBookings
      : allBookings.filter((b) => b.professional_id === selectedProfessional);

  const bookedDates = filteredBookings.map((b) => b.date);

  console.log("All bookings:", allBookings);
  console.log("Filtered bookings:", filteredBookings);
  console.log("Booked dates:", bookedDates);
  console.log("Selected professional:", selectedProfessional);

  const upcomingBookings = filteredBookings.filter((b) => b.date >= today);

  const getProfessionalName = (profId: string) => {
    if (profId === "prof1") return "Person 1";
    if (profId === "prof2") return "Person 2";
    return profId;
  };

  const getServiceNames = (servicesJson: string) => {
    try {
      const ids = JSON.parse(servicesJson);
      const names = ids.map((id: string) => serviceMap[id] || id);
      return names.join(", ");
    } catch {
      return servicesJson;
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange in App.tsx sets session/role to null and
    // ProtectedRoute redirects to "/" automatically.
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      width="100vw"
      textAlign="center"
      sx={{
        backgroundColor: colors.background.light,
        padding: 2,
      }}
    >
      <h2
        style={{
          marginBottom: "20px",
          fontSize: "2rem",
          color: colors.text.primary,
        }}
      >
        Owner Panel
      </h2>
      <Link to="/owner">Owner Panel</Link>

      {/* Theme Toggle Button */}
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
          borderRadius: "5px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        Logout
      </button>

      {/* Booking Statistics */}
      <BookingStatistics allBookings={allBookings} />

      {/* Professional Filter */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography
          variant="body1"
          sx={{ marginBottom: 1, color: colors.text.secondary }}
        >
          Select Professional:
        </Typography>
        <ToggleButtonGroup
          value={selectedProfessional}
          exclusive
          onChange={handleProfessionalChange}
          sx={{
            backgroundColor: colors.background.medium,
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
          <ToggleButton value="all" sx={{ px: 3 }}>
            All
          </ToggleButton>
          <ToggleButton value="prof1" sx={{ px: 3 }}>
            Person 1
          </ToggleButton>
          <ToggleButton value="prof2" sx={{ px: 3 }}>
            Person 2
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <p
        style={{
          marginBottom: "30px",
          fontSize: "1.2rem",
          color: colors.text.secondary,
        }}
      >
        {selectedProfessional === "all"
          ? "All bookings"
          : `${getProfessionalName(selectedProfessional)}'s bookings`}
        ({filteredBookings.length} total, {upcomingBookings.length} upcoming)
        <br />
        <span style={{ fontSize: "0.9rem", color: "#999" }}>
          Click on a booked date to see details
        </span>
        <br />
        {/* <span style={{ fontSize: "0.8rem", color: colors.error.main }}>
          Debug: Raw bookings count: {allBookings.length} | Booked dates:{" "}
          {bookedDates.join(", ") || "none"}
        </span> */}
        {allBookings.length === 0 && (
          <>
            <br />
            <span
              style={{
                fontSize: "0.9rem",
                color: colors.error.main,
                fontWeight: "bold",
              }}
            >
              ⚠️ No bookings found! Check browser console for RLS policy errors.
            </span>
            <br />
            <span style={{ fontSize: "0.8rem", color: colors.text.secondary }}>
              If you have bookings in the database, this is likely a Row Level
              Security (RLS) issue.
              <br />
              Go to Supabase Dashboard → Table Editor → bookings table → Check
              RLS policies
            </span>
          </>
        )}
      </p>

      <Box
        sx={{
          backgroundColor: colors.background.medium,
          borderRadius: "15px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.06)",
          padding: 3,
          width: "90%",
          maxWidth: "1200px",
        }}
      >
        <BigCalendar
          selectedDates={selectedDates}
          setSelectedDates={(dates) => {
            setSelectedDates(dates);
            if (dates[0]) {
              handleDayClick(dates[0]);
            }
          }}
          allowedDates={bookedDates}
          enableMultipleViews={true}
          defaultView="month"
        />
      </Box>

      {/* Debug: Show all bookings list
      {allBookings.length > 0 && (
        <Box
          sx={{
            marginTop: 3,
            padding: 2,
            backgroundColor: colors.background.medium,
            borderRadius: "10px",
            width: "90%",
            maxWidth: "1200px",
          }}
        >
          <Typography variant="h6" sx={{ color: colors.text.primary, mb: 2 }}>
            Debug: All Bookings in Database ({allBookings.length})
          </Typography>
          {allBookings.map((booking, index) => (
            <Box
              key={booking.id || index}
              sx={{
                p: 2,
                mb: 1,
                backgroundColor: colors.background.light,
                borderRadius: "8px",
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: colors.background.card,
                },
              }}
              onClick={() => {
                setSelectedBooking(booking);
                loadUserProfile(booking.user_id);
                setShowBookingDialog(true);
              }}
            >
              <Typography variant="body1" sx={{ color: colors.text.primary }}>
                <strong>Date:</strong>{" "}
                {dayjs(booking.date).format("MMMM DD, YYYY")} |{" "}
                <strong>Professional:</strong>{" "}
                {getProfessionalName(booking.professional_id)} |{" "}
                <strong>Status:</strong>{" "}
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "8px",
                    backgroundColor:
                      booking.status === "confirmed"
                        ? colors.status.confirmed
                        : booking.status === "pending"
                          ? colors.accent.main
                          : booking.status === "completed"
                            ? "#6366f1"
                            : booking.status === "expired"
                              ? "#78716c"
                              : colors.error.main,
                    color: "white",
                    fontSize: "0.8rem",
                  }}
                >
                  {booking.status}
                </span>
              </Typography>
            </Box>
          ))}
        </Box>
      )} */}

      {/* Summary section - Only upcoming bookings
      <Box
        sx={{
          marginTop: 1,
          padding: 2,
          backgroundColor: colors.background.medium,
          borderRadius: "10px",
          minWidth: "300px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", color: colors.text.primary }}>
          Upcoming Bookings:
        </h3>
        {upcomingBookings.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "center",
            }}
          >
            {upcomingBookings.slice(0, 10).map((booking, index) => (
              <span
                key={index}
                onClick={() => {
                  setSelectedBooking(booking);
                  loadUserProfile(booking.user_id);
                  setShowBookingDialog(true);
                }}
                style={{
                  backgroundColor: "rgba(46, 125, 50, 0.06)",
                  color: colors.accent.main,
                  padding: "4px 8px",
                  borderRadius: "5px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {dayjs(booking.date).format("MMM DD")}
                {selectedProfessional === "all" &&
                  ` (${getProfessionalName(booking.professional_id)})`}
              </span>
            ))}
            {upcomingBookings.length > 10 && (
              <span style={{ color: "#666", fontStyle: "italic" }}>
                ...and {upcomingBookings.length - 10} more
              </span>
            )}
          </Box>
        ) : (
          <p style={{ color: colors.text.secondary, fontStyle: "italic" }}>
            No upcoming bookings
          </p>
        )}
      </Box> */}

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
        <DialogActions>
          {/* Owner can force-confirm a pending booking (bypasses customer confirmation) */}
          {selectedBooking && selectedBooking.status === "pending" && (
            <Button
              onClick={async () => {
                const headers = getAuthHeaders();
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
                const headers = getAuthHeaders();
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
                const headers = getAuthHeaders();
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
                const headers = getAuthHeaders();
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
                const headers = getAuthHeaders();
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
                const headers = getAuthHeaders();
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
