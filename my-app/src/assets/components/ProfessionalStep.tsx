import { Avatar, Box } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { getNextAvailableSlot, type ProfessionalOption } from "./professionalsService";

interface ProfessionalStepProps {
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string | null) => void;
  professionals: ProfessionalOption[];
  serviceDuration?: number;
}

// "Today 3:00 PM" / "Tomorrow 10:00 AM" / "Mon 9:00 AM"
function formatNextSlot(date: string, startTime: string, t: TFunction, locale: string): string {
  const slotDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((slotDate.getTime() - today.getTime()) / 86400000);
  const dayLabel =
    dayDiff === 0 ? t("common.today") : dayDiff === 1 ? t("common.tomorrow") : slotDate.toLocaleDateString(locale, { weekday: "short" });
  const [h, m] = startTime.split(":").map(Number);
  const timeLabel = new Date(2000, 0, 1, h, m).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
  return `${dayLabel} ${timeLabel}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfessionalStep({
  selectedProfessional,
  onProfessionalSelect,
  professionals,
  serviceDuration = 0,
}: ProfessionalStepProps) {
  const colors = useResolvedColors();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "gr" ? "el-GR" : "en-GB";
  const [nextSlots, setNextSlots] = useState<Record<string, { date: string; start_time: string } | null>>({});

  useEffect(() => {
    let isMounted = true;
    setNextSlots({});
    Promise.all(
      professionals.map(async (p) => {
        if (!p.tenant_id) return [p.code, null] as const;
        return [p.code, await getNextAvailableSlot(p.code, p.tenant_id, serviceDuration)] as const;
      }),
    ).then((entries) => {
      if (isMounted) setNextSlots(Object.fromEntries(entries));
    });
    return () => {
      isMounted = false;
    };
  }, [professionals, serviceDuration]);

  // Earliest slot across all professionals, for the "Any professional" card.
  const earliestAny = Object.values(nextSlots)
    .filter((s): s is { date: string; start_time: string } => !!s)
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))[0];

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent.light, mb: 0.75 }}>
          {t("booking.step_of", { step: 3, total: 5 })}
        </Box>
        <Box sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 300, color: colors.text.primary, lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>{t("professional_step.title")}</strong>
          <br />
          <span style={{ fontSize: 14, color: colors.text.secondary }}>{t("professional_step.subtitle")}</span>
        </Box>
      </Box>

      {professionals.length === 0 && (
        <Box sx={{ color: colors.text.secondary, py: 4, textAlign: "center" }}>
          {t("professional_step.none")}
        </Box>
      )}

      {professionals.length > 0 && (
        <Box
          key="any"
          onClick={() => onProfessionalSelect(null)}
          sx={{
            position: "relative",
            background: selectedProfessional === null ? colors.background.card : colors.background.medium,
            border: `1px solid ${selectedProfessional === null ? colors.accent.main : colors.border.main}`,
            borderRadius: "14px",
            p: 2.25,
            mb: 1.25,
            cursor: "pointer",
            overflow: "hidden",
            transition: "border-color 0.2s, background 0.2s, transform 0.15s",
            "&:hover": { background: colors.background.card, transform: "translateY(-1px)" },
            "&:active": { transform: "translateY(0)" },
            ...(selectedProfessional === null && {
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
            <Avatar
              sx={{
                width: 46, height: 46,
                background: colors.background.medium,
                border: `1px dashed ${colors.border.main}`,
                fontSize: 15, fontWeight: 700, color: colors.text.secondary,
                flexShrink: 0,
              }}
            >
              <span className="material-icons" style={{ fontSize: 20 }}>groups</span>
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ fontSize: 15, fontWeight: 600, color: colors.text.primary }}>{t("booking.any_professional")}</Box>
              <Box sx={{ fontSize: 12, color: colors.text.secondary, mt: 0.25 }}>
                {earliestAny ? t("professional_step.next", { slot: formatNextSlot(earliestAny.date, earliestAny.start_time, t, locale) }) : t("professional_step.assign_first")}
              </Box>
            </Box>
            <Box
              sx={{
                width: 22, height: 22, borderRadius: "50%",
                background: colors.accent.main,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: selectedProfessional === null ? 1 : 0,
                transform: selectedProfessional === null ? "scale(1)" : "scale(0.5)",
                transition: "all 0.2s",
                flexShrink: 0,
              }}
            >
              <span className="material-icons" style={{ fontSize: 14, color: "#fff" }}>check</span>
            </Box>
          </Box>
        </Box>
      )}

      {professionals.map((professional) => {
        const selected = selectedProfessional === professional.code;
        return (
          <Box
            key={professional.id}
            onClick={() => onProfessionalSelect(professional.code)}
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
              "&:hover": { background: colors.background.card, transform: "translateY(-1px)" },
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
              {/* Avatar */}
              <Avatar
                src={professional.photo_url || undefined}
                sx={{
                  width: 46, height: 46,
                  background: colors.accent.main,
                  fontSize: 15, fontWeight: 700, color: "#fff",
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${colors.background.overlay}`,
                }}
              >
                {initials(professional.name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 15, fontWeight: 600, color: colors.text.primary }}>{professional.name}</Box>
                {nextSlots[professional.code] && (
                  <Box sx={{ fontSize: 12, color: colors.text.secondary, mt: 0.25 }}>
                    {t("professional_step.next", { slot: formatNextSlot(nextSlots[professional.code]!.date, nextSlots[professional.code]!.start_time, t, locale) })}
                  </Box>
                )}
              </Box>
              {/* Check */}
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
