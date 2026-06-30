import { Box } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import type { ProfessionalOption } from "./professionalsService";

interface ProfessionalStepProps {
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string) => void;
  professionals: ProfessionalOption[];
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
}: ProfessionalStepProps) {
  const colors = useResolvedColors();

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent.light, mb: 0.75 }}>
          Step 3 of 5
        </Box>
        <Box sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 300, color: colors.text.primary, lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>Select Professional</strong>
          <br />
          <span style={{ fontSize: 14, color: colors.text.secondary }}>Who would you like to book with?</span>
        </Box>
      </Box>

      {professionals.length === 0 && (
        <Box sx={{ color: colors.text.secondary, py: 4, textAlign: "center" }}>
          No professionals available for this tenant.
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
              <Box
                sx={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: colors.accent.main,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: "#fff",
                  flexShrink: 0,
                  boxShadow: `0 4px 12px ${colors.background.overlay}`,
                }}
              >
                {initials(professional.name)}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ fontSize: 15, fontWeight: 600, color: colors.text.primary }}>{professional.name}</Box>
                <Box sx={{ fontSize: 12, color: colors.text.secondary, mt: 0.25 }}>{professional.code}</Box>
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
