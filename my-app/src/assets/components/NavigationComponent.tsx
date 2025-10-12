import { Box, Button } from "@mui/material";
import { colors, componentColors } from "../../theme";

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
  canProceedNext
}: NavigationComponentProps) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      mb={3}
      sx={{
        backgroundColor: componentColors.navigationButton.background,
        padding: { xs: 1.5, sm: 2 },
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        gap: { xs: 1, sm: 0 },
      }}
    >
      <Button
        variant="outlined"
        onClick={onPreviousStep}
        disabled={currentStep <= 1}
        sx={{ 
          minWidth: { xs: '100px', sm: '120px' },
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          padding: { xs: '6px 12px', sm: '8px 16px' },
          color: currentStep <= 1 
            ? componentColors.navigationButton.disabled.text 
            : componentColors.navigationButton.text,
          borderColor: currentStep <= 1 
            ? componentColors.navigationButton.disabled.background 
            : componentColors.navigationButton.border,
          backgroundColor: 'transparent',
          '&:hover': {
            borderColor: colors.accent.hover,
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
          '&:disabled': {
            borderColor: componentColors.navigationButton.disabled.background,
            color: componentColors.navigationButton.disabled.text,
          }
        }}
      >
        Previous
      </Button>

      <Box 
        textAlign="center"
        sx={{
          order: { xs: 3, sm: 0 },
          flexBasis: { xs: '100%', sm: 'auto' },
          mt: { xs: 1, sm: 0 },
        }}
      >
        <span style={{ 
          fontSize: '14px', 
          color: componentColors.navigationButton.text,
          fontWeight: 'bold'
        }}>
          Step {currentStep} of {totalSteps}
        </span>
      </Box>

      <Button
        variant="contained"
        onClick={onNextStep}
        disabled={!canProceedNext}
        sx={{
          minWidth: { xs: '100px', sm: '120px' },
          fontSize: { xs: '0.75rem', sm: '0.875rem' },
          padding: { xs: '6px 12px', sm: '8px 16px' },
          backgroundColor: canProceedNext 
            ? componentColors.navigationButton.text 
            : componentColors.navigationButton.disabled.background,
          color: canProceedNext 
            ? colors.accent.main 
            : componentColors.navigationButton.disabled.text,
          '&:hover': {
            backgroundColor: canProceedNext ? '#f5f5f5' : componentColors.navigationButton.disabled.background
          },
          '&:disabled': {
            backgroundColor: componentColors.navigationButton.disabled.background,
            color: componentColors.navigationButton.disabled.text,
          }
        }}
      >
        Next
      </Button>
    </Box>
  );
}