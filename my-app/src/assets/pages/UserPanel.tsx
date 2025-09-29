import { useEffect, useState } from "react";
import { supabase } from "../components/supabaseClient";
import { Calendar } from "../components/calendar";
import NavigationComponent from "../components/NavigationComponent";

export default function UserPanel() {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

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

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h2>Customer Panel</h2>
      <NavigationComponent
  currentStep={currentStep}
  totalSteps={totalSteps}
  onPreviousStep={() => setCurrentStep(currentStep - 1)}
  onNextStep={() => setCurrentStep(currentStep + 1)}
  canProceedNext={true}
/>
      <p>Select a date to book:</p>
      <Calendar
        selectedDates={[selectedDate]}
        setSelectedDates={(dates: string[]) => setSelectedDate(dates[0])}
        allowedDates={availableDates}
      />
      {/* <button onClick={handleBook} style={{ marginTop: "50px" }}>
        Book this date
      </button> */}
    </div>
  );
}
