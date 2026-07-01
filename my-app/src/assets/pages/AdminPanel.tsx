import { Calendar } from "../components/calendar";
import { Box, Tabs, Tab, IconButton, Select, MenuItem, FormControl, InputLabel } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { supabase } from "../components/supabaseClient";
import { generateWeekdaysInRange, excludeDates } from "../components/dateUtils";
import { Link } from "react-router-dom";
import SMSAdminDashboard from "../components/SMSAdminDashboard";
import { getColors } from "../../theme";
import { toggleTheme } from "../../slices/themeSlice";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useTenantContext } from "../../context/useTenantContext";
import {
  fetchProfessionals,
  getProfessionalNameByCode,
  type ProfessionalOption,
} from "../components/professionalsService";

interface TenantOption {
  id: string;
  name: string;
  slug: string;
  config: {
    primaryColor?: string;
    primaryLight?: string;
    primaryDark?: string;
    primaryHover?: string;
    primaryOverlay?: string;
    [key: string]: unknown;
  };
}

interface ProfessionalHours {
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  tenant_id?: string;
}

export default function AdminPanel() {
  const dispatch = useDispatch();
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const { tenant } = useTenantContext();
  const [allTenants, setAllTenants] = useState<TenantOption[]>([]);
  const [activeTenant, setActiveTenant] = useState<TenantOption | null>(null);
  const activeBrand = activeTenant?.config?.primaryColor
    ? {
        primaryColor: activeTenant.config.primaryColor,
        primaryLight: activeTenant.config.primaryLight ?? activeTenant.config.primaryColor,
        primaryDark: activeTenant.config.primaryDark ?? activeTenant.config.primaryColor,
        primaryHover: activeTenant.config.primaryHover ?? activeTenant.config.primaryColor,
        primaryOverlay: activeTenant.config.primaryOverlay ?? `${activeTenant.config.primaryColor}1a`,
      }
    : undefined;
  const colors = getColors(mode, activeBrand);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [weekdays, setWeekdays] = useState([1, 2, 3, 4, 5]); // Mon-Fri
  const [holidays, setHolidays] = useState(["2026-01-01", "2026-12-25"]);
  const [currentTab, setCurrentTab] = useState(0);

  // Professional hours state
  const [selectedProfessional, setSelectedProfessional] = useState<
    string | null
  >(null);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [professionalHours, setProfessionalHours] = useState<{
    [key: string]: ProfessionalHours[];
  }>({});
  const [committedHours, setCommittedHours] = useState<ProfessionalHours[]>([]);
  const [committedLoading, setCommittedLoading] = useState(false);

  const getProfessionalName = (code: string | null | undefined) =>
    getProfessionalNameByCode(professionals, code);

  const handleSaveAvailability = async () => {
    if (!selectedDates.length) return alert("Select at least one date");
    if (!activeTenant?.id) {
      alert("❌ Tenant not loaded yet. Please wait and try again.");
      return;
    }

    // Guard against duplicate dates from mixed manual/range selection.
    const uniqueDates = Array.from(new Set(selectedDates)).sort();

    console.log(
      "[handleSaveAvailability] Saving",
      uniqueDates.length,
      "unique dates",
    );

    try {
      // Format the dates for upsert
      const formattedDates: { date: string; tenant_id: string }[] =
        uniqueDates.map((date) => ({
          date,
          tenant_id: activeTenant.id,
        }));

      console.log(
        "[handleSaveAvailability] Formatted dates:",
        formattedDates.slice(0, 5),
        "...",
      );

      // First, delete all existing dates for this tenant to avoid conflicts
      console.log("[handleSaveAvailability] Clearing existing availability...");
      const { error: deleteError } = await supabase
        .from("availability")
        .delete()
        .eq("tenant_id", activeTenant.id);

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

  // Sync activeTenant from context on first load
  useEffect(() => {
    if (tenant && !activeTenant) {
      setActiveTenant({ id: tenant.id, name: tenant.name, slug: tenant.slug, config: tenant.config ?? {} });
    }
  }, [tenant, activeTenant]);

  // Fetch all tenants for the switcher
  useEffect(() => {
    supabase
      .from("tenants")
      .select("id, name, slug, config")
      .then(({ data }) => {
        if (data) setAllTenants(data as TenantOption[]);
      });
  }, []);

  const handleTenantSwitch = async (tenantId: string) => {
    const selected = allTenants.find((t) => t.id === tenantId);
    if (!selected) return;
    await supabase.rpc("set_current_tenant", { p_tenant_id: tenantId });
    setActiveTenant(selected);
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Reload data whenever the active tenant changes
  useEffect(() => {
    if (activeTenant?.id) {
      loadProfessionals();
      loadProfessionalHours();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenant?.id]);

  useEffect(() => {
    loadCommittedHours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfessional, activeTenant?.id]);

  const loadProfessionals = async () => {
    if (!activeTenant?.id) return;

    const rows = await fetchProfessionals(activeTenant.id);
    if (!isMountedRef.current) return;
    setProfessionals(rows);

    setSelectedProfessional((prev) => {
      if (prev && rows.some((p) => p.code === prev)) return prev;
      return rows[0]?.code ?? null;
    });
  };

  const loadProfessionalHours = async () => {
    if (!activeTenant?.id) return;

    const { data, error } = await supabase
      .from("professional_hours")
      .select("*")
      .eq("tenant_id", activeTenant.id)
      .order("day_of_week");

    if (error) {
      console.error("Error loading professional hours:", error);
      return;
    }

    const groupedHours: { [key: string]: ProfessionalHours[] } = {};

    data?.forEach((hour: ProfessionalHours) => {
      if (!groupedHours[hour.professional_id]) {
        groupedHours[hour.professional_id] = [];
      }
      groupedHours[hour.professional_id].push(hour);
    });

    if (isMountedRef.current) setProfessionalHours(groupedHours);
  };

  const loadCommittedHours = async () => {
    if (!activeTenant?.id || !selectedProfessional) return;
    setCommittedLoading(true);
    const { data, error } = await supabase
      .from("professional_hours")
      .select("*")
      .eq("tenant_id", activeTenant.id)
      .eq("professional_id", selectedProfessional)
      .order("day_of_week");
    if (!error && isMountedRef.current) setCommittedHours(data ?? []);
    setCommittedLoading(false);
  };

  const handleSaveProfessionalHours = async () => {
    console.log("=== Starting Save Professional Hours ===");
    console.log("Selected Professional:", selectedProfessional);
    console.log("Professional Hours State:", professionalHours);

    if (!selectedProfessional) {
      alert("Please select a professional first.");
      return;
    }

    const hoursToSave = professionalHours[selectedProfessional] ?? [];
    console.log("Hours to Save:", hoursToSave);

    if (!hoursToSave || hoursToSave.length === 0) {
      console.warn("No working days to save");
      alert("Please add at least one working day");
      return;
    }

    if (!activeTenant?.id) {
      alert("❌ Tenant not loaded yet. Please wait and try again.");
      return;
    }

    const hoursData = hoursToSave.map(
      ({ professional_id, day_of_week, start_time, end_time }) => ({
        professional_id,
        day_of_week,
        start_time,
        end_time,
        tenant_id: activeTenant.id,
      }),
    );

    console.log("Prepared Hours Data for Insert:", hoursData);

    try {
      // First, delete existing hours for this professional (scoped to tenant)
      console.log(
        "Deleting existing hours for professional:",
        selectedProfessional,
      );
      const { error: deleteError } = await supabase
        .from("professional_hours")
        .delete()
        .eq("professional_id", selectedProfessional)
        .eq("tenant_id", activeTenant.id);

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
      await loadCommittedHours();
    } catch (error) {
      console.error("Unexpected error in handleSaveProfessionalHours:", error);
      alert("❌ An unexpected error occurred. Check the console for details.");
    }

    console.log("=== End Save Professional Hours ===");
  };

  const handleAddWorkingDay = (dayOfWeek: number) => {
    if (!selectedProfessional) return;

    const newHour: ProfessionalHours = {
      professional_id: selectedProfessional,
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
    };

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: [...(prev[selectedProfessional] ?? []), newHour],
    }));
  };

  const handleRemoveWorkingDay = (dayOfWeek: number) => {
    if (!selectedProfessional) return;

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: (prev[selectedProfessional] ?? []).filter(
        (h) => h.day_of_week !== dayOfWeek,
      ),
    }));
  };

  const handleUpdateTime = (
    dayOfWeek: number,
    field: "start_time" | "end_time",
    value: string,
  ) => {
    if (!selectedProfessional) return;

    setProfessionalHours((prev) => ({
      ...prev,
      [selectedProfessional]: (prev[selectedProfessional] ?? []).map((h) =>
        h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h,
      ),
    }));
  };

  const handleCopyFromDefault = () => {
    if (!selectedProfessional) return;

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
    if (!selectedProfessional) return;

    const otherProfessional = professionals.find(
      (p) => p.code !== selectedProfessional,
    );

    if (!otherProfessional) {
      alert("Add another professional first to copy hours from them.");
      return;
    }

    const otherProf = otherProfessional.code;
    const otherHours = professionalHours[otherProf] ?? [];

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
    if (!selectedProfessional) return false;

    return (professionalHours[selectedProfessional] ?? []).some(
      (h) => h.day_of_week === dayOfWeek,
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange in App.tsx sets session/role to null and
    // ProtectedRoute redirects to "/" automatically.
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

      {/* Tenant Switcher */}
      {allTenants.length > 1 && (
        <Box sx={{ maxWidth: 300, margin: "0 auto 20px auto" }}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ color: colors.text.primary }}>Active Tenant</InputLabel>
            <Select
              value={activeTenant?.id ?? ""}
              label="Active Tenant"
              onChange={(e) => handleTenantSwitch(e.target.value)}
              sx={{ color: colors.text.primary }}
            >
              {allTenants.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name ?? t.slug}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

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
            {professionals.map((professional) => (
              <button
                key={professional.id}
                onClick={() => setSelectedProfessional(professional.code)}
                style={{
                  padding: "10px 30px",
                  cursor: "pointer",
                  backgroundColor:
                    selectedProfessional === professional.code
                      ? colors.accent.main
                      : colors.background.light,
                  color:
                    selectedProfessional === professional.code
                      ? "white"
                      : colors.text.primary,
                  border: "none",
                  borderRadius: "5px",
                  fontWeight: "bold",
                }}
              >
                {professional.name}
              </button>
            ))}
          </Box>

          {professionals.length === 0 && (
            <p style={{ color: colors.text.secondary, textAlign: "center" }}>
              No professionals found for this tenant. Add rows to the
              professionals table first.
            </p>
          )}

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
              {getProfessionalName(
                professionals.find((p) => p.code !== selectedProfessional)
                  ?.code,
              )}
            </button>
          </Box>

          {/* Working Days Management */}
          <Box>
            <h4 style={{ color: colors.text.primary }}>Working Days</h4>
            <p style={{ color: colors.text.secondary, marginBottom: "15px" }}>
              Select which days {getProfessionalName(selectedProfessional)}{" "}
              works and set their hours:
            </p>

            {[0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
              const workingDay = isWorkingDay(dayOfWeek);
              const dayHours = (
                professionalHours[selectedProfessional ?? ""] ?? []
              ).find((h) => h.day_of_week === dayOfWeek);

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

          {/* Committed Hours — live read from DB */}
          <Box mt={3} p={2} sx={{ backgroundColor: colors.background.light, borderRadius: 1, border: `1px solid ${colors.border.main}` }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <strong style={{ color: colors.text.primary }}>
                ✅ Saved in DB for {getProfessionalName(selectedProfessional)}
              </strong>
              <button
                onClick={loadCommittedHours}
                style={{ fontSize: 12, padding: "4px 12px", cursor: "pointer", background: colors.background.medium, color: colors.text.primary, border: `1px solid ${colors.border.main}`, borderRadius: 4 }}
              >
                Refresh
              </button>
            </Box>
            {committedLoading ? (
              <p style={{ color: colors.text.secondary, margin: 0 }}>Loading…</p>
            ) : committedHours.length === 0 ? (
              <p style={{ color: "tomato", margin: 0 }}>⚠️ No hours committed to DB for this professional</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: colors.text.secondary }}>
                <thead>
                  <tr>
                    {["Day", "Start", "End"].map((h) => (
                      <th key={h} style={{ textAlign: "left", paddingBottom: 4, borderBottom: `1px solid ${colors.border.main}`, color: colors.text.primary }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {committedHours.map((h) => (
                    <tr key={h.day_of_week}>
                      <td style={{ padding: "3px 0" }}>{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][h.day_of_week]}</td>
                      <td>{h.start_time}</td>
                      <td>{h.end_time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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
