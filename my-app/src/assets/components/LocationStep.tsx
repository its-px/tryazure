import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";

interface LocationStepProps {
  selectedLocation: "your_place" | "our_place" | null;
  onLocationSelect: (location: "your_place" | "our_place") => void;
}

const LOCATIONS = [
  {
    key: "our_place" as const,
    icon: "store",
    label: "booking.at_our_place",
    sub: "location.visit_us",
  },
  {
    key: "your_place" as const,
    icon: "home",
    label: "booking.at_your_place",
    sub: "location.we_come",
  },
];

export default function LocationStep({ selectedLocation, onLocationSelect }: LocationStepProps) {
  const colors = useResolvedColors();
  const { t } = useTranslation();

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent.light, mb: 0.75 }}>
          {t("booking.step_of", { step: 1, total: 5 })}
        </Box>
        <Box sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 300, color: colors.text.primary, lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>{t("location.title")}</strong>
          <br />
          <span style={{ fontSize: 14, color: colors.text.secondary }}>{t("location.subtitle")}</span>
        </Box>
      </Box>

      {LOCATIONS.map(({ key, icon, label, sub }) => {
        const selected = selectedLocation === key;
        return (
          <Box
            key={key}
            onClick={() => onLocationSelect(key)}
            sx={{
              position: "relative",
              background: selected ? colors.background.card : colors.background.medium,
              border: `1px solid ${selected ? colors.accent.main : colors.border.main}`,
              borderRadius: "14px",
              p: 2.25,
              mb: 1.25,
              cursor: "pointer",
              overflow: "hidden",
              transition: "border-color 0.2s, background 0.2s, transform 0.15s",
              "&:hover": {
                borderColor: selected ? colors.accent.main : colors.border.main,
                background: colors.background.card,
                transform: "translateY(-1px)",
              },
              "&:active": { transform: "translateY(0)" },
              ...(selected && {
                "&::after": {
                  content: '""',
                  position: "absolute", inset: 0,
                  background: colors.background.overlay,
                  borderRadius: "14px",
                  pointerEvents: "none",
                },
              }),
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.75 }}>
              <Box
                sx={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: selected ? colors.accent.main : colors.background.card,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "background 0.2s",
                }}
              >
                <span className="material-icons" style={{ fontSize: 22, color: selected ? "#fff" : colors.text.secondary }}>
                  {icon}
                </span>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ fontSize: 15, fontWeight: 600, color: colors.text.primary, mb: 0.25 }}>{t(label)}</Box>
                <Box sx={{ fontSize: 12, color: colors.text.secondary }}>{t(sub)}</Box>
              </Box>
              {/* Check indicator */}
              <Box
                sx={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: colors.accent.main,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: selected ? 1 : 0,
                  transform: selected ? "scale(1)" : "scale(0.5)",
                  transition: "all 0.2s",
                  flexShrink: 0,
                }}
              >
                <span className="material-icons" style={{ fontSize: 14, color: "#fff" }}>check</span>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
