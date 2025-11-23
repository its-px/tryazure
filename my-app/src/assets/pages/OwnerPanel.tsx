import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { supabase } from "../components/supabaseClient";
import { getColors } from "../../theme";
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
} from "@mui/material";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedProfessional, setSelectedProfessional] =
    useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([
    dayjs().format("YYYY-MM-DD"),
  ]);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});

  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    loadBookings();
    loadServiceMap();
  }, []);

  const loadBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      console.error("Error loading bookings:", error);
    } else if (data) {
      setAllBookings(data);
    }
  };

  const loadServiceMap = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("id, name");
      if (error) {
        console.error("Error loading services:", error);
        return;
      }
      const map: Record<string, string> = {};
      data?.forEach((service) => {
        map[service.id] = service.name;
      });
      setServiceMap(map);
    } catch (err) {
      console.error("Exception loading services:", err);
    }
  };

  const loadUserProfile = async (userId: string) => {
    const { data: profileData, error } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("id", userId)
      .single();

    if (!error && profileData) {
      setUserProfile({
        full_name: profileData.full_name || "N/A",
        phone: profileData.phone || "N/A",
        email: profileData.email || "N/A",
      });
    } else {
      console.error("Error loading profile:", error);
      setUserProfile({
        full_name: "N/A",
        phone: "N/A",
        email: "N/A",
      });
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
    newProfessional: string | null
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
    navigate("/");
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
          {selectedBooking && selectedBooking.status === "pending" && (
            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from("bookings")
                  .update({ status: "confirmed" })
                  .eq("id", selectedBooking.id);

                if (error) {
                  alert("Error updating status: " + error.message);
                } else {
                  alert("✅ Booking confirmed!");
                  await loadBookings();
                  setShowBookingDialog(false);
                }
              }}
              variant="contained"
              color="success"
              sx={{ mr: 1 }}
            >
              Confirm Booking
            </Button>
          )}
          {selectedBooking && selectedBooking.status === "confirmed" && (
            <Button
              onClick={async () => {
                const { error } = await supabase
                  .from("bookings")
                  .update({ status: "pending" })
                  .eq("id", selectedBooking.id);

                if (error) {
                  alert("Error updating status: " + error.message);
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
          <Button
            onClick={() => setShowBookingDialog(false)}
            variant="contained"
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
