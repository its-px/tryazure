import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Calendar } from "../components/calendar";
import { SERVICES } from "../components/services";
import type { Service } from "../components/services";
import { Box, Button, Dialog, DialogContent, TextField } from "@mui/material";

type BookingStep = 'service' | 'date' | 'summary' | 'profile';
type PageView = 'booking' | 'business' | 'qr' | 'account';

interface UserProfile {
  fullName: string;
  username: string;
  phone: string;
  email: string;
  password: string;
}

export default function UserPanel() {
  // Booking flow state
  const [currentStep, setCurrentStep] = useState<BookingStep>('service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  
  // Page navigation state
  const [currentPage, setCurrentPage] = useState<PageView>('booking');
  
  // Profile creation state
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [newProfile, setNewProfile] = useState<UserProfile>({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    password: ''
  });

  useEffect(() => {
    const loadAvailableDates = async () => {
      const { data, error } = await supabase
        .from("availability")
        .select("date");

      if (error) console.error("Error fetching available dates:", error);
      else setAvailableDates(data.map((d: any) => d.date));
    };

    loadAvailableDates();
  }, []);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
  };

  const handleNextStep = () => {
    if (currentStep === 'service' && selectedService) {
      setCurrentStep('date');
    } else if (currentStep === 'date' && selectedDate) {
      setCurrentStep('summary');
    } else if (currentStep === 'summary') {
      setCurrentStep('profile');
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'service': return selectedService !== null;
      case 'date': return selectedDate !== "";
      case 'summary': return true;
      case 'profile': return false;
      default: return false;
    }
  };

  const handleCreateProfile = async () => {
    if (!newProfile.fullName || !newProfile.username || !newProfile.phone || 
        !newProfile.email || !newProfile.password) {
      alert("Please fill all fields");
      return;
    }

    // Here you would typically create the profile in Supabase
    console.log("Creating profile:", newProfile);
    alert("Profile created successfully!");
    setShowProfileDialog(false);
    
    // Proceed with booking
    handleFinalBooking();
  };

  const handleFinalBooking = async () => {
    if (!selectedService || !selectedDate) return;

    const {  error } = await supabase.from("bookings").insert([
      { 
        booking_date: selectedDate,
        service_id: selectedService.id,
        service_name: selectedService.name
      },
    ]);

    if (error) console.error("Booking error:", error);
    else {
      alert(`✅ Booking confirmed for ${selectedService.name} on ${selectedDate}`);
      // Reset the form
      setCurrentStep('service');
      setSelectedService(null);
      setSelectedDate("");
    }
  };

  const handleGoogleLogin = () => {
    // Implement Google+ login
    alert("Google+ login not implemented yet");
  };

  const handleEmailLogin = () => {
    // Implement email login
    alert("Email login not implemented yet");
  };

  const renderNavigationButtons = () => (
    <Box display="flex" gap={2} justifyContent="center" mb={3}>
      <Button 
        variant={currentPage === 'booking' ? 'contained' : 'outlined'}
        onClick={() => setCurrentPage('booking')}
      >
        Book Appointment
      </Button>
      <Button 
        variant={currentPage === 'business' ? 'contained' : 'outlined'}
        onClick={() => setCurrentPage('business')}
      >
        Business Info
      </Button>
      <Button 
        variant={currentPage === 'qr' ? 'contained' : 'outlined'}
        onClick={() => setCurrentPage('qr')}
      >
        QR Code
      </Button>
      <Button 
        variant={currentPage === 'account' ? 'contained' : 'outlined'}
        onClick={() => {
          setCurrentPage('account');
          alert("Please login to view your account");
        }}
      >
        User Account
      </Button>
    </Box>
  );

  const renderBookingContent = () => {
    switch (currentStep) {
      case 'service':
        return (
          <Box>
            <h3>Choose Your Service</h3>
            <Box display="flex" gap={3} justifyContent="center" flexWrap="wrap">
              {SERVICES.map((service) => (
                <Box
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  sx={{
                    border: selectedService?.id === service.id ? '3px solid #1976d2' : '1px solid #ccc',
                    borderRadius: '10px',
                    padding: 3,
                    cursor: 'pointer',
                    minWidth: '200px',
                    textAlign: 'center',
                    backgroundColor: selectedService?.id === service.id ? '#e3f2fd' : 'white',
                    '&:hover': { backgroundColor: '#f5f5f5' }
                  }}
                >
                  <h4>{service.name}</h4>
                  <p>{service.description}</p>
                  <p><strong>Duration:</strong> {service.duration}</p>
                  {service.price && <p><strong>Price:</strong> {service.price}</p>}
                </Box>
              ))}
            </Box>
          </Box>
        );

      case 'date':
        return (
          <Box>
            <h3>Selected Service: {selectedService?.name}</h3>
            <p>Select a date for your appointment:</p>
            <Calendar
              selectedDates={[selectedDate]}
              setSelectedDates={(dates: string[]) => setSelectedDate(dates[0])}
              allowedDates={availableDates}
            />
          </Box>
        );

      case 'summary':
        return (
          <Box>
            <h3>Booking Summary</h3>
            <Box sx={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
              <p><strong>Service:</strong> {selectedService?.name}</p>
              <p><strong>Date:</strong> {selectedDate}</p>
              <p><strong>Duration:</strong> {selectedService?.duration}</p>
              {selectedService?.price && <p><strong>Price:</strong> {selectedService?.price}</p>}
            </Box>
          </Box>
        );

      case 'profile':
        return (
          <Box>
            <h3>Complete Your Booking</h3>
            <p>Login or create an account to complete your booking</p>
            <Box display="flex" gap={2} justifyContent="center" mt={3}>
              <Button variant="contained" onClick={handleGoogleLogin}>
                Login with Google+
              </Button>
              <Button variant="contained" onClick={handleEmailLogin}>
                Login with Email
              </Button>
              <Button variant="outlined" onClick={() => setShowProfileDialog(true)}>
                Create New Profile
              </Button>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  const renderPageContent = () => {
    switch (currentPage) {
      case 'booking':
        return (
          <Box>
            {currentStep !== 'service' && (
              <Button 
                variant="outlined" 
                onClick={() => {
                  if (currentStep === 'date') setCurrentStep('service');
                  else if (currentStep === 'summary') setCurrentStep('date');
                  else if (currentStep === 'profile') setCurrentStep('summary');
                }}
                sx={{ mb: 2 }}
              >
                ← Back
              </Button>
            )}
            
            {currentStep !== 'profile' && (
              <Button
                variant="contained"
                onClick={handleNextStep}
                disabled={!canProceed()}
                sx={{ 
                  mb: 3,
                  backgroundColor: canProceed() ? '#87ceeb' : '#ccc',
                  '&:hover': {
                    backgroundColor: canProceed() ? '#5bb3d1' : '#ccc'
                  }
                }}
              >
                Next Step
              </Button>
            )}

            <Box
              sx={{
                border: '1px solid #ddd',
                borderRadius: '15px',
                padding: 4,
                minHeight: '400px',
                backgroundColor: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {renderBookingContent()}
            </Box>

            {currentStep === 'profile' && (
              <Box
                sx={{
                  border: '1px solid #ddd',
                  borderRadius: '15px',
                  padding: 4,
                  mt: 3,
                  backgroundColor: '#f9f9f9',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <h3>Complete Your Booking</h3>
                <p>Choose how you'd like to proceed with your booking</p>
              </Box>
            )}
          </Box>
        );

      case 'business':
        return (
          <Box textAlign="center" mt={5}>
            <h2>Business Information</h2>
            <p>This page is not created yet</p>
          </Box>
        );

      case 'qr':
        return (
          <Box textAlign="center" mt={5}>
            <h2>QR Code</h2>
            <p>This page is not created yet</p>
          </Box>
        );

      case 'account':
        return (
          <Box textAlign="center" mt={5}>
            <h2>User Account</h2>
            <p>Please login to view your account history</p>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        padding: 3
      }}
    >
      <Box maxWidth="800px" margin="0 auto">
        <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Welcome to Our Service</h2>
        
        {renderNavigationButtons()}
        {renderPageContent()}

        {/* Profile Creation Dialog */}
        <Dialog open={showProfileDialog} onClose={() => setShowProfileDialog(false)} maxWidth="sm" fullWidth>
          <DialogContent>
            <h3>Create New Profile</h3>
            <Box display="flex" flexDirection="column" gap={2} mt={2}>
              <TextField
                label="Full Name"
                value={newProfile.fullName}
                onChange={(e) => setNewProfile({...newProfile, fullName: e.target.value})}
                fullWidth
              />
              <TextField
                label="Username"
                value={newProfile.username}
                onChange={(e) => setNewProfile({...newProfile, username: e.target.value})}
                fullWidth
              />
              <TextField
                label="Phone Number"
                value={newProfile.phone}
                onChange={(e) => setNewProfile({...newProfile, phone: e.target.value})}
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={newProfile.email}
                onChange={(e) => setNewProfile({...newProfile, email: e.target.value})}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={newProfile.password}
                onChange={(e) => setNewProfile({...newProfile, password: e.target.value})}
                fullWidth
              />
              <Box display="flex" gap={2} mt={2}>
                <Button variant="contained" onClick={handleCreateProfile} fullWidth>
                  Create New Profile
                </Button>
                <Button variant="outlined" onClick={() => setShowProfileDialog(false)} fullWidth>
                  Cancel
                </Button>
              </Box>
            </Box>
          </DialogContent>
        </Dialog>
      </Box>
    </Box>
  );
}