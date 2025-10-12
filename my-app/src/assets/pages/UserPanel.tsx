import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { Calendar } from "../components/calendar";
import NavigationComponent from "../components/NavigationComponent";
import LocationStep from "../components/LocationStep";
import ServicesStep from "../components/ServicesStep";
import ProfessionalStep from "../components/ProfessionalStep";
import Hero from "../components/hero";
import InfoPage from "../components/InfoPage";
import { Box } from "@mui/material";
import LoginModal from "../components/LoginModal";
import { Button } from "@mui/material";
import UserAccountPage from "../components/UserAccountPage";
import { Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";


export default function UserPanel() {
  // Page navigation
  const [currentPage, setCurrentPage] = useState<'booking' | 'info' | 'qr' | 'account'>('booking');

  // Booking states
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [selectedLocation, setSelectedLocation] = useState<'your_place' | 'our_place' | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  // Load available dates based on selected professional
  useEffect(() => {
    const loadAvailableDates = async () => {
      if (!selectedProfessional) {
        const { data, error } = await supabase
          .from("availability")
          .select("date");

        if (error) console.error("Error fetching available dates:", error);
        else setAvailableDates(data?.map((d: any) => d.date) || []);
        return;
      }

      const { data: shopDates, error: shopError } = await supabase
        .from("availability")
        .select("date");

      if (shopError || !shopDates) {
        console.error("Error fetching shop dates:", shopError);
        setAvailableDates([]);
        return;
      }

      const { data: professionalBookings, error: profError } = await supabase
        .from("bookings")
        .select("date")
        .eq("professional_id", selectedProfessional);

      if (profError) {
        console.error("Error fetching professional bookings:", profError);
        setAvailableDates([]);
        return;
      }

      const bookedDates = professionalBookings?.map((b: any) => b.date) || [];
      const availableDates = shopDates
        .map((d: any) => d.date)
        .filter(date => !bookedDates.includes(date));

      setAvailableDates(availableDates);
    };

    loadAvailableDates();
  }, [selectedProfessional]);

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  // Check if user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);


  const handleProfessionalSelect = (professionalId: string) => {
    setSelectedProfessional(professionalId);
    setSelectedDate("");
  };

  const handleLocationSelect = (location: 'your_place' | 'our_place') => {
    setSelectedLocation(location);
    setCurrentStep(2);
  };

  const canProceedNext = () => {
    switch (currentStep) {
      case 1: return selectedLocation !== null;
      case 2: return selectedServices.length > 0;
      case 3: return selectedProfessional !== null;
      case 4: return selectedDate !== "" && availableDates.length > 0;
      case 5: return false;
      default: return false;
    }
  };

  const handleCompleteBooking = async () => {
    if (!selectedDate || !selectedLocation || !selectedProfessional || selectedServices.length === 0) {
      alert("Please complete all steps");
      return;
    }



    const { data: existingBooking, error: checkError } = await supabase
      .from("bookings")
      .select("id")
      .eq("professional_id", selectedProfessional)
      .eq("date", selectedDate)
      .maybeSingle();

    if (existingBooking) {
      alert("❌ This professional is already booked on this date. Please select a different date or professional.");
      return;
    }

    if (checkError) {
      console.error("Error checking booking:", checkError);
      alert("Error checking availability");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    const bookingData = {
      user_id: user?.id,
      date: selectedDate,
      location: selectedLocation,
      services: JSON.stringify(selectedServices),
      professional_id: selectedProfessional,
      status: 'pending',
    };

    const { error } = await supabase.from("bookings").insert([bookingData]);

    if (error) {
      console.error("Booking error:", error);
      if (error.code === '23505') {
        alert("❌ This professional is already booked on this date!");
      } else {
        alert("❌ Error creating booking: " + error.message);
      }
    } else {
      alert("✅ Booking confirmed successfully!");
      setCurrentStep(1);
      setSelectedLocation(null);
      setSelectedServices([]);
      setSelectedProfessional(null);
      setSelectedDate("");
      try {
        const response = await fetch(
          "https://qrvxmqksekxbtipdnfru.supabase.co/functions/v1/send_booking_email",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhtcWtzZWt4YnRpcGRuZnJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MTI5MjMsImV4cCI6MjA3MTk4ODkyM30._BiC3KYWKR5HTz7osjHxxwA-mdHIy867IelMbHvsEPc",
            },
            body: JSON.stringify({
              email: user?.email,
              name: user?.user_metadata?.full_name || "Customer",
              bookingDate: selectedDate,
              location: selectedLocation,
              services: selectedServices,
              professional: selectedProfessional,
            }),
          }
        );

        const result = await response.json();
        if (result.success) {
          console.log("Booking confirmation email sent:", result.data.id);
        } else {
          console.error("Failed to send confirmation email:", result.error);
        }
      } catch (err) {
        console.error("Error calling Edge Function:", err);
      }



    }
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setShowLogoutDialog(false);
    setCurrentPage('booking');
    setCurrentStep(1);
    alert("You have been logged out successfully");
  };


  // Render different pages based on currentPage
  const renderPage = () => {
    switch (currentPage) {
      case 'info':
        return <InfoPage />;

      case 'qr':
        return (
          <Box sx={{ padding: 4, textAlign: "center" }}>
            <h2>QR Code Page</h2>

            <Box textAlign="center" mt={3}>
              <Box
                component="img"
                src="/qr.png"
                alt="qr"
                sx={{ width: "20%", maxHeight: 700, objectFit: "cover", borderRadius: 2 }}
              />
            </Box>
          </Box>
        );

      case 'account':
        return (
          <Box sx={{ padding: 4, textAlign: "center" }}>
            {!isLoggedIn ? (
              <>
                <h2>User Account</h2>
                <p>Please login to view your account</p>
                <Button
                  variant="contained"
                  onClick={() => setShowLoginModal(true)}
                  sx={{ mt: 2 }}
                >
                  Login
                </Button>
              </>
            ) : (
              <UserAccountPage />
            )}
          </Box>
        );

      case 'booking':

      default:
        return (
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            {/* <h2>Customer Panel</h2> */}

            {currentStep > 1 && (
              <NavigationComponent

                currentStep={currentStep}
                totalSteps={totalSteps}
                onPreviousStep={() => setCurrentStep(currentStep - 1)}
                onNextStep={() => setCurrentStep(currentStep + 1)}
                canProceedNext={canProceedNext()}
              />
            )}

            {currentStep === 1 && (
              <LocationStep
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
              />
            )}

            {currentStep === 2 && (
              <ServicesStep
                selectedServices={selectedServices}
                onServiceToggle={handleServiceToggle}
              />
            )}

            {currentStep === 3 && (
              <ProfessionalStep
                selectedProfessional={selectedProfessional}
                onProfessionalSelect={handleProfessionalSelect}
              />
            )}

            {currentStep === 4 && (
              <div>
                <h3>Select a Date for {selectedProfessional === 'prof1' ? 'Person 1' : 'Person 2'}</h3>

                {availableDates.length === 0 ? (
                  <div style={{
                    padding: '40px',
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '10px',
                    margin: '20px'
                  }}>
                    <h4 style={{ color: '#856404' }}>No Available Dates</h4>
                    <p style={{ color: '#856404' }}>
                      This professional has no available dates.
                      Either all dates are booked or the admin hasn't set any availability yet.
                    </p>
                    <p style={{ color: '#856404' }}>
                      Please go back and select a different professional.
                    </p>
                  </div>
                ) : (
                  <>
                    <p>Choose an available date for your appointment:</p>
                    <Calendar
                      selectedDates={[selectedDate]}
                      setSelectedDates={(dates: string[]) => setSelectedDate(dates[0] || "")}
                      allowedDates={availableDates}
                    />
                    {selectedDate && (
                      <div style={{
                        marginTop: '20px',
                        padding: '10px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '5px'
                      }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>
                          Selected Date: {selectedDate}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {currentStep === 5 && (
              <div style={{ padding: '40px' }}>
                <h3>Booking Summary</h3>
                <p>Location: {selectedLocation === 'your_place' ? 'At Your Place' : 'At Our Place'}</p>
                <p>Services: {selectedServices.length} selected</p>
                <p>Professional: {
                  selectedProfessional === 'prof1' ? 'Person 1' :
                    selectedProfessional === 'prof2' ? 'Person 2' :
                      selectedProfessional
                }</p>
                <p>Date: {selectedDate}</p>
                <button
                  onClick={handleCompleteBooking}
                  style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#1b5e20',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Booking
                </button>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div style={{
      width: '100%', minHeight: '100vh', margin: 0,
      padding: 0
    }}>
      {/* Login Modal - Always available, controlled by showLoginModal state */}
      <LoginModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Hero Navigation - Always visible at top */}
      <Hero
        onBookingClick={() => {
          setCurrentPage('booking');
          setCurrentStep(1);
        }}
        onInfoClick={() => setCurrentPage('info')}
        onQRClick={() => setCurrentPage('qr')}
        onAccountClick={() => setCurrentPage('account')}
        onExitClick={() => setShowLogoutDialog(true)}
        isLoggedIn={isLoggedIn}
        currentPage={currentPage}
      />
      <div style={{ width: '100%' }}>
        {/* Render the selected page below the Hero */}
        {renderPage()}
      </div>

    </div>

  );
}