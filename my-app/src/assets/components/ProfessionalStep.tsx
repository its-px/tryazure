import { Box, Chip } from "@mui/material";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors, getComponentColors } from "../../theme";

interface Professional {
  id: string;
  name: string;
  specialties: string[];
}

interface ProfessionalStepProps {
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string) => void;
}

const PROFESSIONALS: Professional[] = [
  {
    id: "prof1",
    name: "Person 1",
    specialties: ["Service 1", "Service 2"],
  },
  {
    id: "prof2",
    name: "Person 2",
    specialties: ["Service 3", "Service 4"],
  },
];

export default function ProfessionalStep({
  selectedProfessional,
  onProfessionalSelect,
}: ProfessionalStepProps) {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const componentColors = getComponentColors(colors);

  return (
    <Box
      textAlign="center"
      padding={{ xs: 2, sm: 3, md: 4 }}
      sx={{
        backgroundColor: colors.background.dark,
        minHeight: "100vh",
      }}
    >
      <h3
        style={{
          marginBottom: "30px",
          color: colors.text.secondary,
          fontSize: window.innerWidth < 600 ? "1.25rem" : "1.5rem",
        }}
      >
        Choose Your Professional
      </h3>

      <Box
        display="flex"
        gap={{ xs: 2, sm: 3, md: 4 }}
        justifyContent="center"
        flexDirection={{ xs: "column", sm: "row" }} // Stack on mobile, row on desktop
        alignItems="center"
        sx={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {PROFESSIONALS.map((professional) => {
          const isSelected = selectedProfessional === professional.id;

          return (
            <Box
              key={professional.id}
              onClick={() => onProfessionalSelect(professional.id)}
              sx={{
                border: isSelected
                  ? `3px solid ${componentColors.serviceCard.selectedBorder}`
                  : `2px solid ${componentColors.serviceCard.border}`,
                borderRadius: "15px",
                padding: { xs: 3, sm: 4 },
                cursor: "pointer",
                width: { xs: "100%", sm: "auto" },
                minWidth: { xs: "100%", sm: "250px" },
                maxWidth: { xs: "100%", sm: "350px" },
                backgroundColor: isSelected
                  ? componentColors.serviceCard.selected
                  : componentColors.serviceCard.background,
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: isSelected
                    ? componentColors.serviceCard.selected
                    : colors.background.card,
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                },
                "&:active": {
                  transform: "scale(0.98)",
                },
              }}
            >
              <h4
                style={{
                  margin: "0 0 15px 0",
                  color: colors.text.primary,
                  fontSize: window.innerWidth < 600 ? "1.1rem" : "1.25rem",
                }}
              >
                {professional.name}
              </h4>
              <p
                style={{
                  margin: "0 0 10px 0",
                  color: colors.text.secondary,
                  fontSize: window.innerWidth < 600 ? "0.875rem" : "1rem",
                }}
              >
                Specialties:
              </p>
              <Box
                display="flex"
                gap={{ xs: 0.5, sm: 1 }}
                flexWrap="wrap"
                justifyContent="center"
              >
                {professional.specialties.map((specialty, index) => (
                  <Chip
                    key={index}
                    label={specialty}
                    size="small"
                    variant="outlined"
                    sx={{
                      color: colors.text.secondary,
                      borderColor: colors.accent.main,
                      fontSize: { xs: "0.7rem", sm: "0.8125rem" },
                      height: { xs: "24px", sm: "28px" },
                      "& .MuiChip-label": {
                        px: { xs: 1, sm: 1.5 },
                      },
                    }}
                  />
                ))}
              </Box>

              {isSelected && (
                <Chip
                  label="Selected"
                  sx={{
                    mt: 2,
                    backgroundColor: componentColors.serviceCard.selected,
                    color: colors.text.primary,
                    fontWeight: "bold",
                    fontSize: { xs: "0.75rem", sm: "0.875rem" },
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
