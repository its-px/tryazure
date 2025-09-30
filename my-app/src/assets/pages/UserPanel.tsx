import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { Calendar } from "../components/calendar";
import NavigationComponent from "../components/NavigationComponent";
import LocationStep from "../components/LocationStep";
import ServicesStep from "../components/ServicesStep";
import ProfessionalStep from "../components/ProfessionalStep";
import hero from "../components/hero";
import Hero from "../components/hero";

export default function UserPanel() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [selectedLocation, setSelectedLocation] = useState<'your_place' | 'our_place' | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

// Load available dates based on selected professional
useEffect(() => {
  const loadAvailableDates = async () => {
    if (!selectedProfessional) {
      // No professional selected yet, show general availability
      const { data, error } = await supabase
        .from("availability")
        .select("date");

      if (error) console.error("Error fetching available dates:", error);
      else setAvailableDates(data.map((d: any) => d.date));
      return;
    }

    // Get all shop available dates
    const { data: shopDates, error: shopError } = await supabase
      .from("availability")
      .select("date");

    if (shopError) {
      console.error("Error fetching shop dates:", shopError);
      return;
    }

    // Get all bookings for the selected professional
    const { data: professionalBookings, error: profError } = await supabase
      .from("bookings")
      //.select("booking_date")
      .select("date")
      .eq("professional_id", selectedProfessional);

    if (profError) {
      console.error("Error fetching professional bookings:", profError);
      return;
    }

    // Get dates where this professional is already booked
    //const bookedDates = professionalBookings.map((b: any) => b.booking_date);
    const bookedDates = professionalBookings.map((b: any) => b.date);

    // Filter out dates where this professional is already booked
    const availableDates = shopDates
      .map((d: any) => d.date)
      .filter(date => !bookedDates.includes(date));

    setAvailableDates(availableDates);
  };

  loadAvailableDates();
}, [selectedProfessional]);

  const handleBook = async () => {
    if (!selectedDate) return alert("Select a date");

    const {  error } = await supabase.from("bookings").insert([
      { booking_date: selectedDate },
    ]);

    if (error) console.error("Booking error:", error);
    else alert("✅ Booking confirmed for " + selectedDate);
  };
const handleServiceToggle = (serviceId: string) => {
  setSelectedServices(prev => {
    if (prev.includes(serviceId)) {
      // Remove if already selected
      return prev.filter(id => id !== serviceId);
    } else {
      // Add if not selected
      return [...prev, serviceId];
    }
  });
};
      const handleProfessionalSelect = (professionalId: string) => {
  setSelectedProfessional(professionalId);
  setSelectedDate(""); // Clear selected date when changing professional
};
const handleLocationSelect = (location: 'your_place' | 'our_place') => {
  setSelectedLocation(location);
  // Auto-advance to next step
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

  // CHECK: Is this professional already booked on this date?
  const { data: existingBooking, error: checkError } = await supabase
    .from("bookings")
    .select("id")
    .eq("professional_id", selectedProfessional)
    .eq("date", selectedDate)
    .maybeSingle();  // Changed from .single() to .maybeSingle()

  // If there's already a booking, prevent duplicate
  if (existingBooking) {
    alert("❌ This professional is already booked on this date. Please select a different date or professional.");
    return;
  }

  // If there's an error (other than no rows found), show it
  if (checkError) {
    console.error("Error checking booking:", checkError);
    alert("Error checking availability");
    return;
  }

  // Proceed with booking
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const bookingData = {
    user_id: user?.id,
    date: selectedDate,
    location: selectedLocation,
    services: JSON.stringify(selectedServices),
    professional_id: selectedProfessional,
    status: 'pending',
  };

  const { data, error } = await supabase
    .from("bookings")
    .insert([bookingData]);

  if (error) {
    console.error("Booking error:", error);
    
    // Check if it's a duplicate error from database constraint
    if (error.code === '23505') {
      alert("❌ This professional is already booked on this date!");
    } else {
      alert("❌ Error creating booking: " + error.message);
    }
  } else {
    alert("✅ Booking confirmed successfully!");
    
    // Reset everything
    setCurrentStep(1);
    setSelectedLocation(null);
    setSelectedServices([]);
    setSelectedProfessional(null);
    setSelectedDate("");
  }
};
return (
  <div style={{ textAlign: "center", marginTop: "50px" }}>
      <Hero />
    <br></br>
    <h2>Customer Panel</h2>
  
    
    {/* Show Navigation ONLY for steps 2-5 */}
    {currentStep > 1 && (
      <NavigationComponent
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPreviousStep={() => setCurrentStep(currentStep - 1)}
        onNextStep={() => setCurrentStep(currentStep + 1)}
        canProceedNext={canProceedNext()}
      />
    )}
    
    {/* Step 1: Location Selection - NO nav buttons here */}
    {currentStep === 1 && (
      <LocationStep
        selectedLocation={selectedLocation}
        onLocationSelect={handleLocationSelect}
      />
    )}
    
    {/* Step 2: Services Selection */}
    {currentStep === 2 && (
      <ServicesStep
        selectedServices={selectedServices}
        onServiceToggle={handleServiceToggle}
      />
    )}
    
    {/* Step 3: Professional Selection */}
    {currentStep === 3 && (
      <ProfessionalStep
        selectedProfessional={selectedProfessional}
        onProfessionalSelect={handleProfessionalSelect}
      />
    )}
    
    {/* Step 4: Calendar */}
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
    
    {/* Step 5: Summary */}
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
            backgroundColor: '#1976d2',
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
);}
