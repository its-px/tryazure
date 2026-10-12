import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";

interface BookingSelectionBarProps {
  services: string[];
  professional: string;
  date: string;
  slot: { start_time: string; end_time: string } | null;
  duration: number;
  price: number;
}

// Recap shown while picking a date/time, so the choices from earlier steps stay visible.
export default function BookingSelectionBar({
  services,
  professional,
  date,
  slot,
  duration,
  price,
}: BookingSelectionBarProps) {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const when = [date, slot && slot.start_time.substring(0, 5)].filter(Boolean).join(" · ");
  const meta = [duration > 0 && t("booking.duration_min", { count: duration }), price > 0 && `€${price.toFixed(2)}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      sx={{
        mx: { xs: 2, md: 3 },
        mb: 2,
        p: 1.75,
        background: colors.background.medium,
        border: `1px solid ${colors.border.main}`,
        borderRadius: "14px",
        fontSize: 13,
        color: colors.text.secondary,
        lineHeight: 1.6,
      }}
    >
      <Box sx={{ fontWeight: 600, color: colors.text.primary }}>{services.join(", ")}</Box>
      <Box>{professional}</Box>
      {when && <Box sx={{ color: colors.accent.light, fontWeight: 600 }}>{when}</Box>}
      {meta && <Box>{meta}</Box>}
    </Box>
  );
}
