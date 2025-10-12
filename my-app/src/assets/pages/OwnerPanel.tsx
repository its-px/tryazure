import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
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
  Divider
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";
import { Link } from "react-router-dom";

interface Booking {
  id: string;
  date: string;
  user_id: string;
  professional_id: string;
  location: string;
  services: string;
  status: string;
}

interface UserProfile {
  full_name: string;
  phone: string;
  email: string;
}

interface CustomPickersDayProps {
  day: Dayjs;
  outsideCurrentMonth: boolean;
  isFirstVisibleCell: boolean;
  isLastVisibleCell: boolean;
  selected?: boolean;
  disabled?: boolean;
  today?: boolean;
  showDaysOutsideCurrentMonth?: boolean;
  bookedDates: string[];
  pastDates: string[];
  onDaySelect: (day: Dayjs) => void;
}

function BookedDay(props: CustomPickersDayProps) {
  const { bookedDates, pastDates, day, onDaySelect, ...other } = props;
  const dateStr = day.format("YYYY-MM-DD");
  const isBooked = bookedDates.includes(dateStr);
  const isPast = pastDates.includes(dateStr);

  return (
    <PickersDay
      {...other}
      day={day}
      onDaySelect={onDaySelect}
      onClick={() => isBooked && onDaySelect(day)}
      sx={{
        backgroundColor: isBooked && isPast ? "rgba(128, 128, 128, 0.3)" : 
                        isBooked ? "rgba(255, 0, 0, 0.5)" : undefined,
        color: isBooked ? "white" : undefined,
        fontWeight: isBooked ? "bold" : undefined,
        cursor: isBooked ? "pointer" : "default",
        "&:hover": {
          backgroundColor: isBooked && isPast ? "rgba(128, 128, 128, 0.5)" :
                          isBooked ? "rgba(255, 0, 0, 0.7)" : undefined,
        },
        borderRadius: "50%",
      }}
    />
  );
}

export default function OwnerPanel() {
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);

  const today = dayjs().format("YYYY-MM-DD");

  useEffect(() => {
    loadBookings();
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
      email: profileData.email || "N/A"
    });
  } else {
    console.error("Error loading profile:", error);
    setUserProfile({
      full_name: "N/A",
      phone: "N/A",
      email: "N/A"
    });
  }
};

  const handleDayClick = async (day: Dayjs) => {
    const dateStr = day.format("YYYY-MM-DD");
    const booking = filteredBookings.find(b => b.date === dateStr);
    
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

  const filteredBookings = selectedProfessional === "all" 
    ? allBookings 
    : allBookings.filter(b => b.professional_id === selectedProfessional);

  const bookedDates = filteredBookings.map(b => b.date);
  const pastDates = filteredBookings
    .filter(b => b.date < today)
    .map(b => b.date);
  
  const upcomingBookings = filteredBookings.filter(b => b.date >= today);

  const getProfessionalName = (profId: string) => {
    if (profId === 'prof1') return 'Person 1';
    if (profId === 'prof2') return 'Person 2';
    return profId;
  };

  const getServiceNames = (servicesJson: string) => {
    try {
      const services = JSON.parse(servicesJson);
      return services.join(', ');
    } catch {
      return servicesJson;
    }
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
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: 2
      }}
    >
      <h2 style={{ marginBottom: "20px", fontSize: "2rem", color: "#333" }}>
        Owner Panel
      </h2>
      <Link to="/owner">Owner Panel</Link>
      
      {/* Professional Filter */}
      <Box sx={{ marginBottom: 3 }}>
        <Typography variant="body1" sx={{ marginBottom: 1, color: "#666" }}>
          Select Professional:
        </Typography>
        <ToggleButtonGroup
          value={selectedProfessional}
          exclusive
          onChange={handleProfessionalChange}
          sx={{
            backgroundColor: "white",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
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

      <p style={{ marginBottom: "30px", fontSize: "1.2rem", color: "#666" }}>
        {selectedProfessional === "all" ? "All bookings" : `${getProfessionalName(selectedProfessional)}'s bookings`} 
        ({filteredBookings.length} total, {upcomingBookings.length} upcoming)
        <br />
        <span style={{ fontSize: "0.9rem", color: "#999" }}>
          Click on a booked date to see details
        </span>
      </p>

      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "15px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          padding: 3,
          "& .MuiDateCalendar-root": {
            width: "auto",
            height: "75vh",
          },
          "& .MuiPickersCalendarHeader-root": {
            fontSize: "1.5rem",
            fontWeight: "bold",
          },
          "& .MuiPickersDay-root": {
            fontSize: "1.1rem",
            width: "calc(75vw / 7)",
            height: "calc(75vh / 7)*1.1",
          },
          "& .MuiPickersCalendar-weekContainer": {
            minHeight: "auto",
          },
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <DateCalendar
            value={dayjs()}
            onChange={() => {}}
            slots={{
              day: (dayProps) => (
                <BookedDay 
                  {...dayProps} 
                  bookedDates={bookedDates}
                  pastDates={pastDates}
                  onDaySelect={handleDayClick}
                />
              ),
            }}
          />
        </LocalizationProvider>
      </Box>

      {/* Summary section - Only upcoming bookings */}
      <Box
        sx={{
          marginTop: 1,
          padding: 2,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "10px",
          minWidth: "300px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Upcoming Bookings:</h3>
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
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  color: "#d32f2f",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                {dayjs(booking.date).format("MMM DD")}
                {selectedProfessional === "all" && ` (${getProfessionalName(booking.professional_id)})`}
              </span>
            ))}
            {upcomingBookings.length > 10 && (
              <span style={{ color: "#666", fontStyle: "italic" }}>
                ...and {upcomingBookings.length - 10} more
              </span>
            )}
          </Box>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>No upcoming bookings</p>
        )}
      </Box>

      {/* Booking Details Dialog */}
      <Dialog 
        open={showBookingDialog} 
        onClose={() => setShowBookingDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Booking Details
        </DialogTitle>
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
                <strong>Date:</strong> {dayjs(selectedBooking.date).format("MMMM DD, YYYY")}
              </Typography>
              <Typography variant="body1">
                <strong>Professional:</strong> {getProfessionalName(selectedBooking.professional_id)}
              </Typography>
              <Typography variant="body1">
                <strong>Location:</strong> {selectedBooking.location === 'your_place' ? 'At Customer Place' : 'At Our Place'}
              </Typography>
              <Typography variant="body1">
                <strong>Services:</strong> {getServiceNames(selectedBooking.services)}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong> {selectedBooking.status.toUpperCase()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBookingDialog(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}