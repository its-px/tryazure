import { Calendar } from "../components/calendar";
import { Box, Tabs, Tab, IconButton } from "@mui/material";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { supabase } from "../components/supabaseClient";
import { generateWeekdaysInRange, excludeDates } from "../components/dateUtils";
import { Link, useNavigate } from "react-router-dom";
import SMSAdminDashboard from "../components/SMSAdminDashboard";
import { getColors } from "../../theme";
import { toggleTheme } from "../../slices/themeSlice";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";

interface ProfessionalHours {
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [holidays, setHolidays] = useState(["2025-01-01", "2025-12-25"]);
  const [currentTab, setCurrentTab] = useState(0);

  // Professional hours state
  const [selectedProfessional, setSelectedProfessional] = useState<
    "prof1" | "prof2"
  >("prof1");
  const [professionalHours, setProfessionalHours] = useState<{
    [key: string]: ProfessionalHours[];
  }>({
    prof1: [],
    prof2: [],
  });

  const handleSaveAvailability = async () => {
    if (!selectedDates.length) return alert("Select at least one date");

    console.log(
      "[handleSaveAvailability] Saving",
      selectedDates.length,
      "dates",
    );

    try {
      // Format the dates for upsert
      const formattedDates: { date: string }[] = selectedDates.map((date) => ({
        date,
      }));

      console.log(
        "[handleSaveAvailability] Formatted dates:",
        formattedDates.slice(0, 5),
        "...",
      );

      // First, delete all existing dates to avoid conflicts
      console.log("[handleSaveAvailability] Clearing existing availability...");
      const { error: deleteError } = await supabase
        .from("availability")
        .delete()
        .neq("date", "1900-01-01"); // Delete all records

      if (deleteError) {
        console.error(
          "[handleSaveAvailability] Error clearing old dates:",
          deleteError,
        );
        alert("❌ Error clearing old dates: " + deleteError.message);
        return;
      }

      console.log(
        "[handleSaveAvailability] Old dates cleared, inserting new dates...",
      );

      // Insert new dates in batches to avoid payload size issues
      const batchSize = 100;
      let insertedCount = 0;

      for (let i = 0; i < formattedDates.length; i += batchSize) {
        const batch = formattedDates.slice(i, i + batchSize);
        console.log(
          `[handleSaveAvailability] Inserting batch ${i / batchSize + 1}/${Math.ceil(formattedDates.length / batchSize)}`,
        );

        const { error: insertError } = await supabase
          .from("availability")
          .insert(batch);

        if (insertError) {
          console.error(
            "[handleSaveAvailability] Error inserting batch:",
            insertError,
          );
          alert(`❌ Error saving dates: ${insertError.message}`);
          return;
        }

        insertedCount += batch.length;
      }

      console.log(
        "[handleSaveAvailability] Successfully saved",
        insertedCount,
        "dates",
      );
      alert(`✅ Successfully saved ${insertedCount} available dates`);
    } catch (err) {
      console.error("[handleSaveAvailability] Exception:", err);
      alert("❌ Unexpected error: " + (err as Error).message);
    }
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
    const groupedHours: { [key: string]: ProfessionalHours[] } = {
      prof1: [],
      prof2: [],
    };

    data?.forEach((hour: ProfessionalHours) => {
      if (groupedHours[hour.professional_id]) {
        groupedHours[hour.professional_id].push(hour);
      }
    });

    setProfessionalHours(groupedHours);
  };

  const handleSaveProfessionalHours = async () => {
    console.log("=== Starting Save Professional Hours ===");
    console.log("Selected Professional:", selectedProfessional);
    console.log("Professional Hours State:", professionalHours);

    const hoursToSave = professionalHours[selectedProfessional];
    console.log("Hours to Save:", hoursToSave);

    if (!hoursToSave || hoursToSave.length === 0) {
      console.warn("No working days to save");
      alert("Please add at least one working day");
      return;
    }

    // Prepare data for insertion - remove 'id' field if it exists
    const hoursData = hoursToSave.map(
      ({ professional_id, day_of_week, start_time, end_time }) => ({
        professional_id,
        day_of_week,
        start_time,
        end_time,
      }),
    );

    console.log("Prepared Hours Data for Insert:", hoursData);

    try {
      // First, delete existing hours for this professional
      console.log(
        "Deleting existing hours for professional:",
        selectedProfessional,
      );
      const { error: deleteError } = await supabase
        .from("professional_hours")
        .delete()
        .eq("professional_id", selectedProfessional);

      if (deleteError) {
        console.error("Error deleting old hours:", deleteError);
        alert("❌ Error deleting old hours: " + deleteError.message);
        return;
      }
      console.log("✅ Successfully deleted old hours");

      // Insert new hours
      console.log("Inserting new hours...");
      const { data: insertedData, error: insertError } = await supabase
        .from("professional_hours")
        .insert(hoursData)
        .select();

      if (insertError) {
        console.error("Error inserting professional hours:", insertError);
        alert("❌ Error saving professional hours: " + insertError.message);
        return;
      }

      console.log("✅ Successfully inserted hours:", insertedData);
      alert("✅ Professional hours saved successfully");

      // Reload hours from database to sync state
      await loadProfessionalHours();
    } catch (error) {
      console.error("Unexpected error in handleSaveProfessionalHours:", error);
      alert("❌ An unexpected error occurred. Check the console for details.");
    }

    console.log("=== End Save Professional Hours ===");
  };

  const handleAddWorkingDay = (dayOfWeek: number) => {
    const newHour: ProfessionalHours = {
      professional_id: selectedProfessional,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
    };

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: [...prev[selectedProfessional], newHour],
    }));
  };

  const handleRemoveWorkingDay = (dayOfWeek: number) => {
    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: prev[selectedProfessional].filter(
        (h) => h.day_of_week !== dayOfWeek,
      ),
    }));
  };

  const handleUpdateTime = (
    dayOfWeek: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: prev[selectedProfessional].map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h,
      ),
    }));
  };

  const handleCopyFromDefault = () => {
    const defaultHours: ProfessionalHours[] = [
      {
        professional_id: selectedProfessional,
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
      },
      {
        professional_id: selectedProfessional,
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
      },
      {
        professional_id: selectedProfessional,
        day_of_week: 3,
        start_time: "09:00",
        end_time: "17:00",
      },
      {
        professional_id: selectedProfessional,
        day_of_week: 4,
        start_time: "09:00",
        end_time: "17:00",
      },
      {
        professional_id: selectedProfessional,
        day_of_week: 5,
        start_time: "09:00",
        end_time: "17:00",
      },
    ];

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: defaultHours,
    }));
  };

  const handleCopyFromOtherProfessional = () => {
    const otherProf = selectedProfessional === "prof1" ? "prof2" : "prof1";
    const otherHours = professionalHours[otherProf];

    if (otherHours.length === 0) {
      alert("The other professional has no hours set");
      return;
    }

    const copiedHours = otherHours.map((h) => ({
      ...h,
      professional_id: selectedProfessional,
    }));

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: copiedHours,
    }));
  };

  const getDayName = (dayOfWeek: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayOfWeek];
  };

  const isWorkingDay = (dayOfWeek: number) => {
    return professionalHours[selectedProfessional].some(
      (h) => h.day_of_week === dayOfWeek,
    );
  };

  const handleLogout = async () => {
    try {
      // Get token from localStorage
      const storedSession = localStorage.getItem("sb-auth-token");
      if (storedSession) {
        const parsed = JSON.parse(storedSession);
        const token = parsed?.access_token;

        if (token) {
          // Call Supabase auth API directly to sign out
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          try {
            await fetch(`${supabaseUrl}/auth/v1/logout`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            });
          } catch (err) {
            console.error("[AdminPanel] Sign out API error:", err);
          }
        }
      }
    } catch (err) {
      console.error("[AdminPanel] Error during logout:", err);
    }

    // Clear localStorage regardless of API response
    localStorage.removeItem("sb-auth-token");
    localStorage.removeItem("bookingState");

    // Trigger storage event for App.tsx to detect
    window.dispatchEvent(new Event("storage"));

    navigate("/");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        backgroundColor: colors.background.light,
        padding: 3,
      }}
    >
      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          color: colors.text.primary,
        }}
      >
        Admin Panel
      </h2>
      <Link
        to="/admin"
        style={{ display: "block", textAlign: "center", marginBottom: "20px" }}
      >
        Admin Panel
      </Link>

      {/* Theme Toggle Button */}
      <IconButton
        onClick={() => dispatch(toggleTheme())}
        sx={{
          position: "absolute",
          top: 20,
          right: 100,
          color: colors.text.primary,
          backgroundColor: colors.background.medium,
          "&:hover": { backgroundColor: colors.background.light },
          width: 40,
          height: 40,
          zIndex: 1000,
        }}
        aria-label={
          mode === "dark" ? "Switch to light theme" : "Switch to dark theme"
        }
      >
        {mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>

      <button
        onClick={handleLogout}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 20px",
          backgroundColor: colors.error.main,
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontWeight: "bold",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        Logout
      </button>

      <Box
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          centered
        >
          <Tab label="Store Availability" />
          <Tab label="Professional Hours" />
          <Tab label="SMS Administration" />
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
          sx={{ maxWidth: "1200px", margin: "20px auto", padding: 2 }}
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
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                (day, index) => (
                  <label key={index} style={{ margin: "0 10px" }}>
                    <input
                      type="checkbox"
                      checked={weekdays.includes(index)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setWeekdays([...weekdays, index]);
                        } else {
                          setWeekdays(
                            weekdays.filter((d: number) => d !== index),
                          );
                        }
                      }}
                    />
                    {day}
                  </label>
                ),
              )}
            </div>
          </Box>

          {/* Holiday Management */}
          <Box>
            <label>Holidays to exclude (comma-separated YYYY-MM-DD):</label>
            <input
              type="text"
              value={holidays.join(", ")}
              onChange={(e) =>
                setHolidays(
                  e.target.value.split(",").map((d: string) => d.trim()),
                )
              }
              style={{ width: "300px" }}
            />
          </Box>

          <button
            onClick={handleGenerateWeekdays}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Generate Available Dates
          </button>

          <label>
            Pick dates the store will be open ({selectedDates.length} selected):
          </label>
          <Calendar
            selectedDates={selectedDates}
            setSelectedDates={setSelectedDates}
          />

          <button
            onClick={handleSaveAvailability}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Save Available Dates
          </button>
        </Box>
      )}

      {/* Professional Hours Tab */}
      {currentTab === 1 && (
        <Box
          sx={{
            maxWidth: "900px",
            margin: "20px auto",
            padding: 3,
            backgroundColor: colors.background.medium,
            borderRadius: 2,
            boxShadow: 1,
          }}
        >
          <h3
            style={{
              textAlign: "center",
              marginBottom: "20px",
              color: colors.text.primary,
            }}
          >
            Manage Professional Working Hours
          </h3>

          {/* Professional Selection */}
          <Box display="flex" justifyContent="center" gap={2} mb={3}>
            <button
              onClick={() => setSelectedProfessional("prof1")}
              style={{
                padding: "10px 30px",
                cursor: "pointer",
                backgroundColor:
                  selectedProfessional === "prof1"
                    ? colors.accent.main
                    : colors.background.light,
                color:
                  selectedProfessional === "prof1"
                    ? "white"
                    : colors.text.primary,
                border: "none",
                borderRadius: "5px",
                fontWeight: "bold",
              }}
            >
              Person 1
            </button>
            <button
              onClick={() => setSelectedProfessional("prof2")}
              style={{
                padding: "10px 30px",
                cursor: "pointer",
                backgroundColor:
                  selectedProfessional === "prof2"
                    ? colors.accent.main
                    : colors.background.light,
                color:
                  selectedProfessional === "prof2"
                    ? "white"
                    : colors.text.primary,
                border: "none",
                borderRadius: "5px",
                fontWeight: "bold",
              }}
            >
              Person 2
            </button>
          </Box>

          {/* Quick Actions */}
          <Box
            display="flex"
            justifyContent="center"
            gap={2}
            mb={3}
            flexWrap="wrap"
          >
            <button
              onClick={handleCopyFromDefault}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: colors.status.confirmed,
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Set Default Hours (Mon-Fri, 9AM-5PM)
            </button>
            <button
              onClick={handleCopyFromOtherProfessional}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                backgroundColor: colors.accent.light,
                color: "white",
                border: "none",
                borderRadius: "5px",
              }}
            >
              Copy from{" "}
              {selectedProfessional === "prof1" ? "Person 2" : "Person 1"}
            </button>
          </Box>

          {/* Working Days Management */}
          <Box>
            <h4 style={{ color: colors.text.primary }}>Working Days</h4>
            <p style={{ color: colors.text.secondary, marginBottom: "15px" }}>
              Select which days{" "}
              {selectedProfessional === "prof1" ? "Person 1" : "Person 2"} works
              and set their hours:
            </p>

            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const workingDay = isWorkingDay(dayOfWeek);
              const dayHours = professionalHours[selectedProfessional].find(
                (h) => h.day_of_week === dayOfWeek,
              );

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
                    backgroundColor: workingDay
                      ? colors.background.light
                      : colors.background.medium,
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: workingDay
                      ? colors.accent.main
                      : colors.background.light,
                  }}
                >
                  <Box flex={1}>
                    <strong style={{ color: colors.text.primary }}>
                      {getDayName(dayOfWeek)}
                    </strong>
                  </Box>

                  {workingDay && dayHours ? (
                    <>
                      <Box display="flex" gap={1} alignItems="center">
                        <label>Start:</label>
                        <input
                          type="time"
                          value={dayHours.start_time}
                          onChange={(e) =>
                            handleUpdateTime(
                              dayOfWeek,
                              "start_time",
                              e.target.value,
                            )
                          }
                          style={{ padding: "5px" }}
                        />
                      </Box>
                      <Box display="flex" gap={1} alignItems="center">
                        <label>End:</label>
                        <input
                          type="time"
                          value={dayHours.end_time}
                          onChange={(e) =>
                            handleUpdateTime(
                              dayOfWeek,
                              "end_time",
                              e.target.value,
                            )
                          }
                          style={{ padding: "5px" }}
                        />
                      </Box>
                      <button
                        onClick={() => handleRemoveWorkingDay(dayOfWeek)}
                        style={{
                          padding: "5px 15px",
                          cursor: "pointer",
                          backgroundColor: colors.error.main,
                          color: "white",
                          border: "none",
                          borderRadius: "5px",
                        }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleAddWorkingDay(dayOfWeek)}
                      style={{
                        padding: "5px 15px",
                        cursor: "pointer",
                        backgroundColor: colors.status.confirmed,
                        color: "white",
                        border: "none",
                        borderRadius: "5px",
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
                padding: "12px 40px",
                cursor: "pointer",
                backgroundColor: colors.accent.main,
                color: "white",
                border: "none",
                borderRadius: "5px",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              Save Professional Hours
            </button>
          </Box>

          {/* Current Status */}
          <Box
            mt={3}
            p={2}
            sx={{ backgroundColor: colors.background.light, borderRadius: 1 }}
          >
            <strong style={{ color: colors.text.primary }}>
              Current Status:
            </strong>
            <p style={{ margin: "5px 0", color: colors.text.secondary }}>
              {selectedProfessional === "prof1" ? "Person 1" : "Person 2"} has{" "}
              {professionalHours[selectedProfessional].length} working day(s)
              configured
            </p>
          </Box>
        </Box>
      )}

      {/* SMS Administration Tab */}
      {currentTab === 2 && (
        <Box
          sx={{
            maxWidth: "1400px",
            margin: "20px auto",
            padding: 0,
          }}
        >
          <SMSAdminDashboard />
        </Box>
      )}
    </Box>
  );
}
