import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import  React,{  } from "react";
import { supabase } from './supabaseClient';
import dayjs, { Dayjs } from "dayjs";
// import { Box } from '@mui/material';

type CalendarProps = {
  selectedDates: string[];
  setSelectedDates: (dates: string[]) => void;
  allowedDates?: string[]; // optional: restrict dates
};
export const Calendar = ({ selectedDates, setSelectedDates, allowedDates }: CalendarProps) => {
  const [currentDate, setCurrentDate] = React.useState<Dayjs | null>(
    selectedDates[0] ? dayjs(selectedDates[0]) : dayjs()
  );

 const isDateAllowed = (date: Dayjs) => {
    if (!allowedDates) return true;
    return allowedDates.includes(date.format("YYYY-MM-DD"));
  };

    //handler 
  // In calendar.tsx, update the handleSave function
const handleSave = async () => {
  if (!currentDate) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // You'll need to pass these as props to Calendar component
  const { data, error } = await supabase.from("bookings").insert([
    {
      user_id: user?.id,
      booking_date: currentDate.format("YYYY-MM-DD"),
      // Add these if you have them as props:
      // professional_id: professionalId,
      // services: selectedServices,
      // location: selectedLocation
    },
  ]);

  if (error) {
    console.error("Error saving booking:", error.message);
    alert(" Failed to book date");
  } else {
    console.log("Booking saved:", data);
    alert(" Booking confirmed for " + currentDate.format("YYYY-MM-DD"));
  }
};
  return (
  
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <StaticDatePicker orientation="landscape"
       value={currentDate}
        onChange={(newValue) => {
          if (newValue && isDateAllowed(newValue)) {
            setCurrentDate(newValue);
            setSelectedDates([newValue.format("YYYY-MM-DD")]);
          }
        }}
        shouldDisableDate={(date) => !isDateAllowed(date)}
        
        slots={{
      toolbar: () => null,       // removes "Select Date" text
      actionBar: () => null,     // removes OK / Cancel buttons
    }}
        disablePast

        


         />
            {/* <button onClick={handleSave}>Book this date</button> */}
    </LocalizationProvider>
  
  );
}
 

//na kanno remvoe to css element me to display none 