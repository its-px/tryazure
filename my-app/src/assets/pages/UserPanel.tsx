import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { Calendar } from "../components/calendar";
import NavigationComponent from "../components/NavigationComponent";
import LocationStep from "../components/LocationStep";
import ServicesStep from "../components/ServicesStep";
import ProfessionalStep from "../components/ProfessionalStep";

export default function UserPanel() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [selectedLocation, setSelectedLocation] = useState<'your_place' | 'our_place' | null>(null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);

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
//   return (
//     <div style={{ textAlign: "center", marginTop: "50px" }}>
//       <h2>Customer Panel</h2>
//       <NavigationComponent
//   currentStep={currentStep}
//   totalSteps={totalSteps}
//   onPreviousStep={() => setCurrentStep(currentStep - 1)}
//   onNextStep={() => setCurrentStep(currentStep + 1)}
//   canProceedNext={true}
// />
 
// {/* Location Selection */}
// <LocationStep
//   selectedLocation={selectedLocation}
//   onLocationSelect={(location) => setSelectedLocation(location)}
// />
// {/* Services Selection */}
// <ServicesStep
//   selectedServices={selectedServices}
//   onServiceToggle={handleServiceToggle}
// />
// {/* Professional Selection */}
// <ProfessionalStep
//   selectedProfessional={selectedProfessional}
//   onProfessionalSelect={(professionalId) => setSelectedProfessional(professionalId)}
// />
//       <p>Select a date to book:</p>
//       <Calendar
//         selectedDates={[selectedDate]}
//         setSelectedDates={(dates: string[]) => setSelectedDate(dates[0])}
//         allowedDates={availableDates}
//       />
//       {/* <button onClick={handleBook} style={{ marginTop: "50px" }}>
//         Book this date
//       </button> */}
//     </div>
//   );

return (
  <div style={{ textAlign: "center", marginTop: "50px" }}>
    <h2>Customer Panel</h2>
    
    {/* Navigation Component */}
    <NavigationComponent
      currentStep={currentStep}
      totalSteps={totalSteps}
      onPreviousStep={() => setCurrentStep(currentStep - 1)}
      onNextStep={() => setCurrentStep(currentStep + 1)}
      canProceedNext={true}
    />
    
    {/* Step 1: Location Selection */}
    {currentStep === 1 && (
      <LocationStep
        selectedLocation={selectedLocation}
        onLocationSelect={(location) => setSelectedLocation(location)}
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
        onProfessionalSelect={(professionalId) => setSelectedProfessional(professionalId)}
      />
    )}
    
    {/* Step 4: Calendar (your existing calendar) */}
    {currentStep === 4 && (
      <div>
        <h3>Select a Date</h3>
        <p>Select a date to book:</p>
        <Calendar
          selectedDates={[selectedDate]}
          setSelectedDates={(dates: string[]) => setSelectedDate(dates[0])}
          allowedDates={availableDates}
        />
      </div>
    )}
    
    {/* Step 5: Summary (placeholder for now) */}
    {currentStep === 5 && (
      <div style={{ padding: '40px' }}>
        <h3>Booking Summary</h3>
        <p>Location: {selectedLocation === 'your_place' ? 'At Your Place' : 'At Our Place'}</p>
        <p>Services: {selectedServices.length} selected</p>
        <p>Professional: {selectedProfessional}</p>
        <p>Date: {selectedDate}</p>
      </div>
    )}
  </div>
);
}
