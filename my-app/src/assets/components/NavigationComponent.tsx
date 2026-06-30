import { Box } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";

interface NavigationComponentProps {
  currentStep: number;
  totalSteps: number;
  onPreviousStep: () => void;
  onNextStep: () => void;
  canProceedNext: boolean;
}

export default function NavigationComponent({
  currentStep,
  totalSteps,
  onPreviousStep,
  onNextStep,
  canProceedNext,
}: NavigationComponentProps) {
  const colors = useResolvedColors();
  const progress = Math.round((currentStep / totalSteps) * 100);

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, mb: 2 }}>
      {/* Progress bar */}
      <Box
        sx={{
          height: 2,
          background: colors.background.card,
          borderRadius: 2,
          mb: 2,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${progress}%`,
            background: `linear-gradient(90deg, ${colors.accent.main}, ${colors.accent.light})`,
            borderRadius: 2,
            transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </Box>

      {/* Prev / count / Next */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
        <Box
          component="button"
          onClick={onPreviousStep}
          disabled={currentStep <= 1}
          sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            background: colors.background.card,
            border: `1px solid ${colors.border.main}`,
            color: currentStep <= 1 ? colors.text.tertiary : colors.text.secondary,
            borderRadius: 9999, px: 2.5, py: 1.25,
            fontSize: 13, fontWeight: 500, cursor: currentStep <= 1 ? "not-allowed" : "pointer",
            fontFamily: "inherit", opacity: currentStep <= 1 ? 0.35 : 1,
            transition: "all 0.2s",
            "&:not(:disabled):hover": {
              borderColor: colors.accent.main,
              color: colors.accent.light,
            },
          }}
        >
          <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
          Back
        </Box>

        <Box
          sx={{
            fontSize: 11, fontWeight: 600,
            color: colors.text.tertiary,
            letterSpacing: "0.06em",
            whiteSpace: "nowrap",
          }}
        >
          {currentStep} / {totalSteps}
        </Box>

        <Box
          component="button"
          onClick={onNextStep}
          disabled={!canProceedNext}
          sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            background: canProceedNext ? colors.accent.main : colors.background.card,
            border: "none",
            color: canProceedNext ? "#fff" : colors.text.tertiary,
            borderRadius: 9999, px: 3, py: 1.25,
            fontSize: 13, fontWeight: 600, cursor: canProceedNext ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            boxShadow: canProceedNext ? `0 4px 16px ${colors.background.overlay}` : "none",
            transition: "all 0.2s",
            flex: 1, maxWidth: 140, justifyContent: "center",
            "&:not(:disabled):hover": {
              background: canProceedNext ? colors.accent.hover : undefined,
            },
          }}
        >
          {currentStep === totalSteps - 1 ? "Confirm" : "Next"}
          <span className="material-icons" style={{ fontSize: 16 }}>arrow_forward</span>
        </Box>
      </Box>
    </Box>
  );
}
