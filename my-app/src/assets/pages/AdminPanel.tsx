import { Calendar } from '../components/calendar';
import { Box } from "@mui/material";
import { useState } from "react";
import { supabase } from '../../supabaseClient';
import { generateWeekdaysInRange, excludeDates } from '../components/dateUtils';

export default function AdminPanel() {
   const [selectedDates, setSelectedDates] = useState<string[]>([]); 
   const [startDate, setStartDate] = useState("2025-01-01");
   const [endDate, setEndDate] = useState("2025-12-31");
   const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
   const [holidays, setHolidays] = useState(["2025-01-01", "2025-12-25"]);
  
  const handleSaveAvailability = async () => {
    if (!selectedDates.length) return alert("Select at least one date");

    // Format the dates for upsert
    const formattedDates: { date: string }[] = selectedDates.map((date) => ({ date }));

    // Fix: Use correct table name "availability"
    const { data, error } = await supabase
      .from("availability")
      .upsert(formattedDates, { onConflict: "date" });

    if (error) console.error("Error saving availability:", error);
    else alert("✅ Available dates saved");
  };

  const handleGenerateWeekdays = () => {
    const allDates = generateWeekdaysInRange(startDate, endDate, weekdays);
    const availableDates = excludeDates(allDates, holidays);
    setSelectedDates(availableDates);
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      width="100vw"
      textAlign="center"
      gap={2}
    >
      <h2>Admin Panel</h2>
      
      {/* Date Range Controls */}
      <Box display="flex" gap={2} alignItems="center">
        <label>Start Date:</label>
        <input 
          type="date" 
          value={startDate} 
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label>End Date:</label>
        <input 
          type="date" 
          value={endDate} 
          onChange={(e) => setEndDate(e.target.value)}
        />
      </Box>

      {/* Weekday Selection */}
      <Box>
        <label>Select weekdays:</label>
        <div>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <label key={index} style={{ margin: '0 10px' }}>
              <input
                type="checkbox"
                checked={weekdays.includes(index)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setWeekdays([...weekdays, index]);
                  } else {
                    setWeekdays(weekdays.filter((d: number) => d !== index));
                  }
                }}
              />
              {day}
            </label>
          ))}
        </div>
      </Box>

      {/* Holiday Management */}
      <Box>
        <label>Holidays to exclude (comma-separated YYYY-MM-DD):</label>
        <input
          type="text"
          value={holidays.join(', ')}
          onChange={(e) => setHolidays(e.target.value.split(',').map((d: string) => d.trim()))}
          style={{ width: '300px' }}
        />
      </Box>

      <button onClick={handleGenerateWeekdays} style={{ marginTop: "10px" }}>
        Generate Available Dates
      </button>

      <label>Pick dates the store will be open ({selectedDates.length} selected):</label>
      <Calendar selectedDates={selectedDates} setSelectedDates={setSelectedDates} />
      
      <button onClick={handleSaveAvailability} style={{ marginTop: "20px" }}>
        Save Available Dates
      </button>
    </Box>
  );
}