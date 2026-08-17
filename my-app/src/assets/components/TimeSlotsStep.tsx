import { Box, Button, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { getAvailableSlots } from "./slotService";
import { joinWaitlist } from "./waitlistService";
import type { ProfessionalOption } from "./professionalsService";

interface TimeSlot {
  start_time: string;
  end_time: string;
}

interface TimeSlotsStepProps {
  professionalId: string | null;
  professionals?: ProfessionalOption[];
  tenantId: string | null;
  selectedDate: string;
  serviceDuration: number;
  selectedSlot: TimeSlot | null;
  onSlotSelect: (slot: TimeSlot) => void;
  serviceId?: string | null;
  userId?: string | null;
}

export default function TimeSlotsStep({
  professionalId,
  professionals = [],
  tenantId,
  selectedDate,
  serviceDuration,
  selectedSlot,
  onSlotSelect,
  serviceId,
  userId,
}: TimeSlotsStepProps) {
  const colors = useResolvedColors();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    if (!tenantId || !selectedDate || !serviceDuration) {
      setSlots([]); setLoading(false); return;
    }
    // "Any professional" (professionalId === null): union the slots of every
    // tenant professional, deduped by start time.
    // ponytail: no per-professional attribution here — booking submission
    // resolves the actual professional again at that point.
    if (!professionalId && professionals.length === 0) {
      setSlots([]); setLoading(false); return;
    }
    let isMounted = true;
    setLoading(true);
    const fetchAll = professionalId
      ? getAvailableSlots(professionalId, selectedDate, serviceDuration, tenantId)
      : Promise.all(
          professionals.map((p) => getAvailableSlots(p.code, selectedDate, serviceDuration, tenantId)),
        ).then((lists) => {
          const byStart = new Map<string, TimeSlot>();
          lists.flat().forEach((s) => byStart.set(s.start_time, s));
          return Array.from(byStart.values()).sort((a, b) => a.start_time.localeCompare(b.start_time));
        });
    fetchAll
      .then((available) => {
        if (!isMounted) return;
        const today = new Date().toISOString().split("T")[0];
        const now = new Date();
        const cur = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        setSlots(selectedDate === today ? available.filter((s: TimeSlot) => s.start_time > cur) : available);
        setLoading(false);
      })
      .catch(() => { if (isMounted) { setSlots([]); setLoading(false); } });
    return () => { isMounted = false; };
  }, [professionalId, professionals, tenantId, selectedDate, serviceDuration]);

  useEffect(() => {
    setWaitlisted(false);
  }, [selectedDate, professionalId, serviceId]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 160, mt: 2 }}>
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  if (!selectedDate) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: colors.text.tertiary, mb: 1.5, px: { xs: 2, md: 3 } }}>
        Available times · {selectedDate}
      </Box>

      {slots.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 3, color: colors.text.secondary, fontSize: 13, px: 2 }}>
          <Box sx={{ mb: waitlisted ? 0 : 1.5 }}>No available slots for this date</Box>
          {serviceId && userId && tenantId && (
            waitlisted ? (
              <Box sx={{ color: colors.accent.main, fontSize: 13 }}>You're on the waitlist — we'll email you if a slot opens up.</Box>
            ) : (
              <Button
                variant="outlined"
                size="small"
                onClick={async () => {
                  const ok = await joinWaitlist(tenantId, userId, serviceId, professionalId, selectedDate || null);
                  if (ok) setWaitlisted(true);
                  else alert("Couldn't join the waitlist, please try again.");
                }}
                sx={{ borderColor: colors.accent.main, color: colors.accent.main }}
              >
                Join Waitlist
              </Button>
            )
          )}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            px: { xs: 2, md: 3 },
          }}
        >
          {slots.map((slot) => {
            const selected = selectedSlot?.start_time === slot.start_time;
            return (
              <Box
                key={slot.start_time}
                component="button"
                onClick={() => onSlotSelect(slot)}
                sx={{
                  background: selected ? colors.accent.main : colors.background.medium,
                  border: `1px solid ${selected ? colors.accent.main : colors.border.main}`,
                  borderRadius: "10px",
                  py: 1.25, px: 0.5,
                  textAlign: "center",
                  fontSize: 13, fontWeight: 500,
                  color: selected ? "#fff" : colors.text.primary,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: selected ? `0 4px 16px ${colors.background.overlay}` : "none",
                  transition: "all 0.15s",
                  "&:hover:not(:disabled)": {
                    borderColor: colors.accent.main,
                    color: selected ? "#fff" : colors.accent.light,
                  },
                }}
              >
                {slot.start_time.substring(0, 5)}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
