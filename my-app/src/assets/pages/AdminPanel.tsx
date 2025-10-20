import { Calendar } from '../components/calendar';
import { Box, Tabs, Tab } from "@mui/material";
import { useState, useEffect } from "react";
import { supabase } from '../components/supabaseClient';
import { generateWeekdaysInRange, excludeDates } from '../components/dateUtils';
import { Link } from 'react-router-dom';

interface ProfessionalHours {
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function AdminPanel() {
   const [selectedDates, setSelectedDates] = useState<string[]>([]);
   const [startDate, setStartDate] = useState("2025-01-01");
   const [endDate, setEndDate] = useState("2025-12-31");
   const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
   const [holidays, setHolidays] = useState(["2025-01-01", "2025-12-25"]);
   const [currentTab, setCurrentTab] = useState(0);

   // Professional hours state
   const [selectedProfessional, setSelectedProfessional] = useState<'prof1' | 'prof2'>('prof1');
   const [professionalHours, setProfessionalHours] = useState<{[key: string]: ProfessionalHours[]}>({
     prof1: [],
     prof2: []
   });
  
  const handleSaveAvailability = async () => {
    if (!selectedDates.length) return alert("Select at least one date");

    // Format the dates for upsert
    const formattedDates: { date: string }[] = selectedDates.map((date) => ({ date }));

    // Fix: Use correct table name "availability"
    const {  error } = await supabase
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

  // Load professional hours on mount
  useEffect(() => {
    loadProfessionalHours();
  }, []);

  const loadProfessionalHours = async () => {
    const { data, error } = await supabase
      .from("professional_hours")
      .select("*")
      .order("day_of_week");

    if (error) {
      console.error("Error loading professional hours:", error);
      return;
    }

    // Group by professional_id
    const groupedHours: {[key: string]: ProfessionalHours[]} = {
      prof1: [],
      prof2: []
    };

    data?.forEach((hour: ProfessionalHours) => {
      if (groupedHours[hour.professional_id]) {
        groupedHours[hour.professional_id].push(hour);
      }
    });

    setProfessionalHours(groupedHours);
  };

  const handleSaveProfessionalHours = async () => {
    const hoursToSave = professionalHours[selectedProfessional];

    if (hoursToSave.length === 0) {
      alert("Please add at least one working day");
      return;
    }

    // First, try to delete existing hours for this professional
    // Use the correct column type - if it fails, we'll handle it
    const { error: deleteError } = await supabase
      .from("professional_hours")
      .delete()
      .eq("professional_id", selectedProfessional);

    if (deleteError) {
      console.error("Error deleting old hours:", deleteError);
      // Check if it's a UUID type error
      if (deleteError.code === '22P02') {
        alert("❌ Database Schema Error: The 'professional_id' column in 'professional_hours' table should be TEXT type, not UUID.\n\nPlease run this SQL in your Supabase SQL Editor:\n\nALTER TABLE professional_hours ALTER COLUMN professional_id TYPE TEXT;");
        return;
      }
      alert("❌ Error saving hours: " + deleteError.message);
      return;
    }

    // Insert new hours
    const { error: insertError } = await supabase
      .from("professional_hours")
      .insert(hoursToSave);

    if (insertError) {
      console.error("Error saving professional hours:", insertError);
      if (insertError.code === '22P02') {
        alert("❌ Database Schema Error: The 'professional_id' column in 'professional_hours' table should be TEXT type, not UUID.\n\nPlease run this SQL in your Supabase SQL Editor:\n\nALTER TABLE professional_hours ALTER COLUMN professional_id TYPE TEXT;");
        return;
      }
      alert("❌ Error saving professional hours: " + insertError.message);
    } else {
      alert("✅ Professional hours saved successfully");
    }
  };

  const handleAddWorkingDay = (dayOfWeek: number) => {
    const newHour: ProfessionalHours = {
      professional_id: selectedProfessional,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00"
    };

    setProfessionalHours(prev => ({
      ...prev,
      [selectedProfessional]: [...prev[selectedProfessional], newHour]
    }));
  };

  const handleRemoveWorkingDay = (dayOfWeek: number) => {
    setProfessionalHours(prev => ({
      ...prev,
      [selectedProfessional]: prev[selectedProfessional].filter(h => h.day_of_week !== dayOfWeek)
    }));
  };

  const handleUpdateTime = (dayOfWeek: number, field: 'start_time' | 'end_time', value: string) => {
    setProfessionalHours(prev => ({
      ...prev,
      [selectedProfessional]: prev[selectedProfessional].map(h =>
        h.day_of_week === dayOfWeek
          ? { ...h, [field]: value }
          : h
      )
    }));
  };

  const handleCopyFromDefault = () => {
    const defaultHours: ProfessionalHours[] = [
      { professional_id: selectedProfessional, day_of_week: 1, start_time: "09:00", end_time: "17:00" },
      { professional_id: selectedProfessional, day_of_week: 2, start_time: "09:00", end_time: "17:00" },
      { professional_id: selectedProfessional, day_of_week: 3, start_time: "09:00", end_time: "17:00" },
      { professional_id: selectedProfessional, day_of_week: 4, start_time: "09:00", end_time: "17:00" },
      { professional_id: selectedProfessional, day_of_week: 5, start_time: "09:00", end_time: "17:00" },
    ];

    setProfessionalHours(prev => ({
      ...prev,
      [selectedProfessional]: defaultHours
    }));
  };

  const handleCopyFromOtherProfessional = () => {
    const otherProf = selectedProfessional === 'prof1' ? 'prof2' : 'prof1';
    const otherHours = professionalHours[otherProf];

    if (otherHours.length === 0) {
      alert("The other professional has no hours set");
      return;
    }

    const copiedHours = otherHours.map(h => ({
      ...h,
      professional_id: selectedProfessional
    }));

    setProfessionalHours(prev => ({
      ...prev,
      [selectedProfessional]: copiedHours
    }));
  };

  const getDayName = (dayOfWeek: number) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek];
  };

  const isWorkingDay = (dayOfWeek: number) => {
    return professionalHours[selectedProfessional].some(h => h.day_of_week === dayOfWeek);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: "#f5f5f5",
        padding: 3
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Panel</h2>
      <Link to="/admin" style={{ display: 'block', textAlign: 'center', marginBottom: '20px' }}>Admin Panel</Link>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', maxWidth: '1200px', margin: '0 auto' }}>
        <Tabs value={currentTab} onChange={(_, newValue) => setCurrentTab(newValue)} centered>
          <Tab label="Store Availability" />
          <Tab label="Professional Hours" />
        </Tabs>
      </Box>

      {/* Store Availability Tab */}
      {currentTab === 0 && (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          textAlign="center"
          gap={2}
          sx={{ maxWidth: '1200px', margin: '20px auto', padding: 2 }}
        >
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

          <button onClick={handleGenerateWeekdays} style={{ marginTop: "10px", padding: '10px 20px', cursor: 'pointer' }}>
            Generate Available Dates
          </button>

          <label>Pick dates the store will be open ({selectedDates.length} selected):</label>
          <Calendar selectedDates={selectedDates} setSelectedDates={setSelectedDates} />

          <button onClick={handleSaveAvailability} style={{ marginTop: "20px", padding: '10px 20px', cursor: 'pointer' }}>
            Save Available Dates
          </button>
        </Box>
      )}

      {/* Professional Hours Tab */}
      {currentTab === 1 && (
        <Box
          sx={{
            maxWidth: '900px',
            margin: '20px auto',
            padding: 3,
            backgroundColor: 'white',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Manage Professional Working Hours</h3>

          {/* Professional Selection */}
          <Box display="flex" justifyContent="center" gap={2} mb={3}>
            <button
              onClick={() => setSelectedProfessional('prof1')}
              style={{
                padding: '10px 30px',
                cursor: 'pointer',
                backgroundColor: selectedProfessional === 'prof1' ? '#1b5e20' : '#ccc',
                color: selectedProfessional === 'prof1' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}
            >
              Person 1
            </button>
            <button
              onClick={() => setSelectedProfessional('prof2')}
              style={{
                padding: '10px 30px',
                cursor: 'pointer',
                backgroundColor: selectedProfessional === 'prof2' ? '#1b5e20' : '#ccc',
                color: selectedProfessional === 'prof2' ? 'white' : 'black',
                border: 'none',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}
            >
              Person 2
            </button>
          </Box>

          {/* Quick Actions */}
          <Box display="flex" justifyContent="center" gap={2} mb={3} flexWrap="wrap">
            <button
              onClick={handleCopyFromDefault}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              Set Default Hours (Mon-Fri, 9AM-5PM)
            </button>
            <button
              onClick={handleCopyFromOtherProfessional}
              style={{
                padding: '8px 16px',
                cursor: 'pointer',
                backgroundColor: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '5px'
              }}
            >
              Copy from {selectedProfessional === 'prof1' ? 'Person 2' : 'Person 1'}
            </button>
          </Box>

          {/* Working Days Management */}
          <Box>
            <h4>Working Days</h4>
            <p style={{ color: '#666', marginBottom: '15px' }}>
              Select which days {selectedProfessional === 'prof1' ? 'Person 1' : 'Person 2'} works and set their hours:
            </p>

            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const workingDay = isWorkingDay(dayOfWeek);
              const dayHours = professionalHours[selectedProfessional].find(h => h.day_of_week === dayOfWeek);

              return (
                <Box
                  key={dayOfWeek}
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                  gap={2}
                  mb={2}
                  p={2}
                  sx={{
                    backgroundColor: workingDay ? '#e8f5e9' : '#fafafa',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: workingDay ? '#1b5e20' : '#e0e0e0'
                  }}
                >
                  <Box flex={1}>
                    <strong>{getDayName(dayOfWeek)}</strong>
                  </Box>

                  {workingDay && dayHours ? (
                    <>
                      <Box display="flex" gap={1} alignItems="center">
                        <label>Start:</label>
                        <input
                          type="time"
                          value={dayHours.start_time}
                          onChange={(e) => handleUpdateTime(dayOfWeek, 'start_time', e.target.value)}
                          style={{ padding: '5px' }}
                        />
                      </Box>
                      <Box display="flex" gap={1} alignItems="center">
                        <label>End:</label>
                        <input
                          type="time"
                          value={dayHours.end_time}
                          onChange={(e) => handleUpdateTime(dayOfWeek, 'end_time', e.target.value)}
                          style={{ padding: '5px' }}
                        />
                      </Box>
                      <button
                        onClick={() => handleRemoveWorkingDay(dayOfWeek)}
                        style={{
                          padding: '5px 15px',
                          cursor: 'pointer',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px'
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAddWorkingDay(dayOfWeek)}
                      style={{
                        padding: '5px 15px',
                        cursor: 'pointer',
                        backgroundColor: '#4caf50',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px'
                      }}
                    >
                      Add Working Hours
                    </button>
                  )}
                </Box>
              );
            })}
          </Box>

          {/* Save Button */}
          <Box display="flex" justifyContent="center" mt={4}>
            <button
              onClick={handleSaveProfessionalHours}
              style={{
                padding: '12px 40px',
                cursor: 'pointer',
                backgroundColor: '#1b5e20',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Save Professional Hours
            </button>
          </Box>

          {/* Current Status */}
          <Box mt={3} p={2} sx={{ backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <strong>Current Status:</strong>
            <p style={{ margin: '5px 0' }}>
              {selectedProfessional === 'prof1' ? 'Person 1' : 'Person 2'} has {professionalHours[selectedProfessional].length} working day(s) configured
            </p>
          </Box>
        </Box>
      )}
    </Box>
  );
}