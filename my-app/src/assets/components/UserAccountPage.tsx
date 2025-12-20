import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from "@mui/material";
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors, getCommonStyles, getStatusColor } from "../../theme";
// import {  requestNotificationPermission ,showBookingNotification } from "../../notifications";

interface Booking {
  id: string;
  date: string;
  location: string;
  services: string;
  professional_id: string;
  status: string;
  created_at: string;
  start_time: string;
  end_time: string;
}

interface UserProfile {
  full_name: string;
  phone: string;
}

// (removed AppUser) using Supabase `User` type instead

export default function UserAccountPage() {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const commonStyles = getCommonStyles(colors);
  const [user, setUser] = useState<User | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([]);
  const [pastBookings, setPastBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    full_name: "",
    phone: "",
  });
  const [editedProfile, setEditedProfile] = useState<UserProfile>({
    full_name: "",
    phone: "",
  });

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<string | null>(null);
  const [serviceMap, setServiceMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    const initializeComponent = async () => {
      try {
        setLoading(true);
        console.log("[UserAccountPage] Initializing component...");

        // Try to get session from localStorage directly to avoid Supabase hang
        const storageKey = "sb-auth-token";
        let sessionUser = null;

        try {
          const storedSession = localStorage.getItem(storageKey);
          if (storedSession) {
            const parsed = JSON.parse(storedSession);
            sessionUser = parsed?.user || null;
            console.log(
              "[UserAccountPage] Session from storage:",
              sessionUser ? sessionUser.id : "None"
            );
          }
        } catch (err) {
          console.error(
            "[UserAccountPage] Error reading session from storage:",
            err
          );
        }

        if (!isMounted) return;

        if (sessionUser) {
          console.log("[UserAccountPage] User:", sessionUser.id);
          setUser(sessionUser);

          console.log("[UserAccountPage] Loading user data...");

          // Load data asynchronously and update loading state separately
          loadUserProfile(sessionUser.id)
            .then(() => console.log("[UserAccountPage] Profile loaded"))
            .catch((err) =>
              console.error("[UserAccountPage] Profile error:", err)
            );

          loadUserBookings(sessionUser.id)
            .then(() => console.log("[UserAccountPage] Bookings loaded"))
            .catch((err) =>
              console.error("[UserAccountPage] Bookings error:", err)
            );

          loadServiceMap()
            .then(() => console.log("[UserAccountPage] Services loaded"))
            .catch((err) =>
              console.error("[UserAccountPage] Services error:", err)
            );
        } else {
          console.log("[UserAccountPage] No active session");
          setUser(null);
        }
      } catch (err) {
        console.error("[UserAccountPage] Error initializing:", err);
        setUser(null);
      } finally {
        if (isMounted) {
          console.log("[UserAccountPage] Setting loading to false");
          setLoading(false);
        }
      }
    };

    initializeComponent();

    return () => {
      isMounted = false;
    };
  }, []);

  const loadServiceMap = async () => {
    try {
      console.log("[UserAccountPage] Loading service map...");
      const { data, error } = await supabase
        .from("services")
        .select("id, name");
      if (error) {
        console.error("[UserAccountPage] Error loading services:", error);
        return;
      }

      const map: Record<string, string> = {};
      data?.forEach((service) => {
        map[service.id] = service.name;
      });
      setServiceMap(map);
      console.log(
        "[UserAccountPage] Service map loaded:",
        Object.keys(map).length,
        "services"
      );
    } catch (err) {
      console.error("[UserAccountPage] Exception loading services:", err);
    }
  };

  const loadUserProfile = async (userId: string) => {
    try {
      console.log("[UserAccountPage] Loading user profile...");
      console.log("[UserAccountPage] About to call supabase.from...");
      const result = supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("id", userId)
        .single();
      console.log(
        "[UserAccountPage] Supabase query created, awaiting result..."
      );
      const { data, error } = await result;
      console.log(
        "[UserAccountPage] Query completed, data:",
        data,
        "error:",
        error
      );

      if (!error && data) {
        setProfile(data);
        setEditedProfile(data);
        console.log("[UserAccountPage] User profile loaded successfully");
      } else if (error) {
        console.error("[UserAccountPage] Error loading profile:", error);
      }
    } catch (err) {
      console.error("[UserAccountPage] Exception loading profile:", err);
    }
  };

  const loadUserBookings = async (userId: string) => {
    try {
      console.log("[UserAccountPage] Loading user bookings...");
      const { data, error } = await supabase
        .from("bookings")
        .select()
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (error) {
        console.error("[UserAccountPage] Error loading bookings:", error);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const upcoming = data?.filter((b) => b.date >= today) || [];
      const past = data?.filter((b) => b.date < today) || [];

      setUpcomingBookings(upcoming);
      setPastBookings(past);
      console.log(
        "[UserAccountPage] Bookings loaded:",
        upcoming.length,
        "upcoming,",
        past.length,
        "past"
      );
    } catch (err) {
      console.error("[UserAccountPage] Exception loading bookings:", err);
    }
  };

  const handleSignOut = async () => {
    console.log("[UserAccountPage] Sign out initiated");

    try {
      // Get token from localStorage
      const storageKey = "sb-auth-token";
      let token = null;
      try {
        const storedSession = localStorage.getItem(storageKey);
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          token = parsed?.access_token;
        }
      } catch (err) {
        console.error("[UserAccountPage] Error reading token:", err);
      }

      if (token) {
        // Call Supabase auth API directly to sign out
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

        try {
          await fetch(`${supabaseUrl}/auth/v1/logout`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });
          console.log("[UserAccountPage] Sign out API called");
        } catch (err) {
          console.error("[UserAccountPage] Sign out API error:", err);
        }
      }

      // Clear localStorage regardless of API response
      localStorage.removeItem(storageKey);
      localStorage.removeItem("bookingState");
      console.log("[UserAccountPage] Cleared localStorage");

      // Clear component state
      setUser(null);
      setUpcomingBookings([]);
      setPastBookings([]);

      // Reload the page to reset all app state
      console.log("[UserAccountPage] Reloading page...");
      window.location.reload();
    } catch (err) {
      console.error("[UserAccountPage] Sign out error:", err);
      // Even if there's an error, clear local state and reload
      localStorage.removeItem("sb-auth-token");
      localStorage.removeItem("bookingState");
      window.location.reload();
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: editedProfile.full_name,
        phone: editedProfile.phone,
      })
      .eq("id", user.id);

    if (error) {
      alert("Error updating profile: " + error.message);
    } else {
      setProfile(editedProfile);
      setShowEditProfile(false);
      alert("Profile updated successfully!");
    }
  };

  const handleCancelBooking = async () => {
    if (!bookingToCancel) return;

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingToCancel);

    if (error) {
      alert("Error cancelling booking: " + error.message);
    } else {
      alert(
        "Booking cancelled successfully! The time slot is now available for booking again."
      );
      if (user) loadUserBookings(user.id);
      setShowCancelDialog(false);
      setBookingToCancel(null);
    }
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      day: date.getDate(),
      fullDate: date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };
  };

  const renderBookingCard = (booking: Booking, isUpcoming: boolean) => {
    const dateInfo = formatDate(booking.date);

    return (
      <Card
        key={booking.id}
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          ...commonStyles.card,
        }}
      >
        {/* Date Section */}
        <Box
          sx={{
            width: { xs: "100%", sm: "100px" },
            display: "flex",
            flexDirection: { xs: "row", sm: "column" },
            alignItems: "center",
            justifyContent: "center",
            borderRight: { xs: "none", sm: `3px solid ${colors.accent.main}` },
            borderBottom: { xs: `3px solid ${colors.accent.main}`, sm: "none" },
            padding: { xs: 1.5, sm: 2 },
            backgroundColor: colors.background.light,
            gap: { xs: 1, sm: 0 },
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: { xs: "0.875rem", sm: "0.75rem" } }}
          >
            {dateInfo.month}
          </Typography>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{ fontSize: { xs: "1.75rem", sm: "2.125rem" } }}
          >
            {dateInfo.day}
          </Typography>
        </Box>

        {/* Booking Details */}
        <CardContent
          sx={{ flex: 1, position: "relative", padding: { xs: 1.5, sm: 2 } }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            flexDirection={{ xs: "column", sm: "row" }}
            gap={{ xs: 1, sm: 0 }}
          >
            <Box flex={1}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "0.875rem" } }}
              >
                {getServiceNames(booking.services)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "0.875rem" } }}
              >
                {booking.start_time.substring(0, 5)} -{" "}
                {booking.end_time.substring(0, 5)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 1,
                  fontSize: { xs: "0.875rem", sm: "0.875rem" },
                }}
              >
                <PersonIcon sx={{ fontSize: { xs: 14, sm: 16 }, mr: 0.5 }} />
                {getProfessionalName(booking.professional_id)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "0.875rem" } }}
              >
                Location:{" "}
                {booking.location === "your_place"
                  ? "At Your Place"
                  : "At Our Place"}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  backgroundColor: getStatusColor(booking.status, colors),
                  color: "white",
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  fontWeight: "bold",
                }}
              >
                {booking.status.toUpperCase()}
              </Box>
            </Box>

            {/* Action Button */}
            {isUpcoming && (
              <IconButton
                color="error"
                onClick={() => {
                  setBookingToCancel(booking.id);
                  setShowCancelDialog(true);
                }}
                sx={{
                  alignSelf: { xs: "flex-end", sm: "flex-start" },
                  mt: { xs: 1, sm: 0 },
                }}
              >
                <DeleteIcon
                  sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
                />
              </IconButton>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ ...commonStyles.pageContainer, textAlign: "center" }}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{ fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" } }}
        >
          User Account
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Please login to view your account and booking history
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...commonStyles.container }}>
      {/* User Profile Header */}
      <Card sx={{ mb: 3, ...commonStyles.cardElevated }}>
        <CardContent sx={{ padding: { xs: 2, sm: 3 } }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexDirection={{ xs: "column", sm: "row" }}
            gap={{ xs: 2, sm: 0 }}
          >
            <Box
              display="flex"
              alignItems="center"
              gap={2}
              width={{ xs: "100%", sm: "auto" }}
            >
              <Box
                sx={{
                  width: { xs: 50, sm: 60 },
                  height: { xs: 50, sm: 60 },
                  borderRadius: "50%",
                  backgroundColor: colors.accent.main,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontSize: { xs: "1.25rem", sm: "1.5rem" },
                  fontWeight: "bold",
                }}
              >
                {profile.full_name
                  ? profile.full_name[0].toUpperCase()
                  : user?.email
                  ? user.email[0].toUpperCase()
                  : "U"}
              </Box>
              <Box flex={1}>
                <Typography
                  variant="h6"
                  sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
                >
                  {profile.full_name || "User"}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                >
                  {user.email}
                </Typography>
                {profile.phone && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
                  >
                    {profile.phone}
                  </Typography>
                )}
              </Box>
            </Box>
            <Box
              display="flex"
              gap={1}
              width={{ xs: "100%", sm: "auto" }}
              justifyContent={{ xs: "center", sm: "flex-end" }}
            >
              <IconButton
                onClick={() => setShowEditProfile(true)}
                sx={{ color: colors.accent.main }}
              >
                <EditIcon sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }} />
              </IconButton>
              <Button
                variant="outlined"
                color="error"
                onClick={handleSignOut}
                size={window.innerWidth < 600 ? "small" : "medium"}
                sx={{ fontSize: { xs: "0.75rem", sm: "0.875rem" } }}
              >
                Sign Out
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs for Upcoming vs Past */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
          sx={{
            "& .MuiTab-root": {
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              minHeight: { xs: "48px", sm: "48px" },
            },
          }}
        >
          <Tab label={`Upcoming (${upcomingBookings.length})`} />
          <Tab label={`History (${pastBookings.length})`} />
        </Tabs>
      </Box>

      {/* Bookings List */}
      {activeTab === 0 && (
        <Box>
          {upcomingBookings.length === 0 ? (
            <Box textAlign="center" py={{ xs: 4, sm: 8 }}>
              <Typography
                variant="h6"
                color="text.secondary"
                gutterBottom
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
              >
                No upcoming appointments
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontSize: { xs: "0.875rem", sm: "0.875rem" } }}
              >
                Book your first appointment to get started!
              </Typography>
            </Box>
          ) : (
            upcomingBookings.map((booking) => renderBookingCard(booking, true))
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {pastBookings.length === 0 ? (
            <Box textAlign="center" py={{ xs: 4, sm: 8 }}>
              <Typography
                variant="h6"
                color="text.secondary"
                sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}
              >
                No booking history yet
              </Typography>
            </Box>
          ) : (
            pastBookings.map((booking) => renderBookingCard(booking, false))
          )}
        </Box>
      )}

      {/* Edit Profile Dialog */}
      <Dialog
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          Edit Profile
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <TextField
              label="Full Name"
              value={editedProfile.full_name}
              onChange={(e) =>
                setEditedProfile({
                  ...editedProfile,
                  full_name: e.target.value,
                })
              }
              fullWidth
              size={window.innerWidth < 600 ? "small" : "medium"}
            />
            <TextField
              label="Phone Number"
              value={editedProfile.phone}
              onChange={(e) =>
                setEditedProfile({ ...editedProfile, phone: e.target.value })
              }
              fullWidth
              size={window.innerWidth < 600 ? "small" : "medium"}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ padding: { xs: 2, sm: 3 } }}>
          <Button
            onClick={() => setShowEditProfile(false)}
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateProfile}
            variant="contained"
            sx={{ backgroundColor: colors.accent.main }}
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Booking Dialog */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
          Cancel Booking
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: { xs: "0.875rem", sm: "1rem" } }}>
            Are you sure you want to cancel this booking?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ padding: { xs: 2, sm: 3 } }}>
          <Button
            onClick={() => setShowCancelDialog(false)}
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            No, Keep It
          </Button>
          <Button
            onClick={handleCancelBooking}
            color="error"
            variant="contained"
            size={window.innerWidth < 600 ? "small" : "medium"}
          >
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
