import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors } from "../../theme";
import { getAvailableSlots } from "./slotService";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface TimeSlotsStepProps {
  professionalId: string | null;
  selectedDate: string;
  serviceDuration: number;
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
}

export default function TimeSlotsStep({
  professionalId,
  selectedDate,
  serviceDuration,
  selectedSlot,
  onSlotSelect,
}: TimeSlotsStepProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!professionalId || !selectedDate || !serviceDuration) {
      setSlots([]);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadSlots = async () => {
      setLoading(true);

      try {
        const availableSlots = await getAvailableSlots(
          professionalId,
          selectedDate,
          serviceDuration
        );

        if (!isMounted) return;

        // Filter out past time slots if booking for today
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        let filteredSlots = availableSlots;
        if (selectedDate === today) {
          // Only show slots that start after current time for today
          filteredSlots = availableSlots.filter(
            (slot: TimeSlot) => slot.start_time > currentTime
          );
        }

        if (isMounted) {
          setSlots(filteredSlots);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error in loadSlots:", err);
        if (isMounted) {
          setSlots([]);
          setLoading(false);
        }
      }
    };

    loadSlots();

    return () => {
      isMounted = false;
    };
  }, [professionalId, selectedDate, serviceDuration]);

  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "200px",
          backgroundColor: colors.background.dark,
        }}
      >
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        padding: { xs: 2, sm: 3, md: 4 },
        backgroundColor: colors.background.dark,
        minHeight: "100vh",
      }}
    >
      <Typography
        variant="h5"
        textAlign="center"
        sx={{
          mb: 3,
          color: colors.text.primary,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        Select a Time Slot
      </Typography>

      {slots.length === 0 ? (
        <Typography textAlign="center" sx={{ color: colors.text.secondary }}>
          No available slots for this date and service duration
        </Typography>
      ) : (
        <Box
          display="grid"
          gridTemplateColumns={{
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(4, 1fr)",
          }}
          gap={2}
          sx={{ maxWidth: "600px", margin: "0 auto" }}
        >
          {slots.map((slot) => (
            <Button
              key={`${slot.start_time}-${slot.end_time}`}
              onClick={() => onSlotSelect(slot)}
              variant={
                selectedSlot?.start_time === slot.start_time
                  ? "contained"
                  : "outlined"
              }
              sx={{
                padding: { xs: 1, sm: 2 },
                backgroundColor:
                  selectedSlot?.start_time === slot.start_time
                    ? colors.accent.main
                    : "transparent",
                color:
                  selectedSlot?.start_time === slot.start_time
                    ? colors.text.primary
                    : colors.text.secondary,
                borderColor: colors.accent.main,
                borderWidth: "2px",
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                "&:hover": {
                  backgroundColor:
                    selectedSlot?.start_time === slot.start_time
                      ? colors.accent.main
                      : colors.background.card,
                },
              }}
            >
              {slot.start_time.substring(0, 5)} -{" "}
              {slot.end_time.substring(0, 5)}
            </Button>
          ))}
        </Box>
      )}
    </Box>
  );
}
