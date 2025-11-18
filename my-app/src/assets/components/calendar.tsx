import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { StaticDatePicker } from "@mui/x-date-pickers/StaticDatePicker";
import React from "react";
import dayjs, { Dayjs } from "dayjs";
// import { Box } from '@mui/material';

type CalendarProps = {
  selectedDates: string[];
  setSelectedDates: (dates: string[]) => void;
  allowedDates?: string[]; // optional: restrict dates
};
export const Calendar = ({
  selectedDates,
  setSelectedDates,
  allowedDates,
}: CalendarProps) => {
  const [currentDate, setCurrentDate] = React.useState<Dayjs | null>(
    selectedDates[0] ? dayjs(selectedDates[0]) : dayjs()
  );

  // Ensure today is selected and triggers setSelectedDates on first mount
  React.useEffect(() => {
    if (!selectedDates[0]) {
      const todayStr = dayjs().format("YYYY-MM-DD");
      setSelectedDates([todayStr]);
      setCurrentDate(dayjs());
    }
  }, [selectedDates, setSelectedDates]);

  const isDateAllowed = (date: Dayjs) => {
    if (!allowedDates) return true;
    return allowedDates.includes(date.format("YYYY-MM-DD"));
  };

  // Booking/save is handled by the booking flow elsewhere (TimeSlotsStep/UserPanel).
  // This component only manages date selection. If you want a local "Book" button
  // re-enable a handler here and wire it to the parent booking flow.
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <StaticDatePicker
        orientation="landscape"
        value={currentDate}
        onChange={(newValue) => {
          if (newValue && isDateAllowed(newValue)) {
            setCurrentDate(newValue);
            setSelectedDates([newValue.format("YYYY-MM-DD")]);
          }
        }}
        shouldDisableDate={(date) => !isDateAllowed(date)}
        slots={{
          toolbar: () => null, // removes "Select Date" text
          actionBar: () => null, // removes OK / Cancel buttons
        }}
        disablePast
      />
      {/* <button onClick={handleSave}>Book this date</button> */}
    </LocalizationProvider>
  );
};
