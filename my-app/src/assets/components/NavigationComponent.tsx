import { Box, Button } from "@mui/material";

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
        backgroundColor: 'white',
        padding: 2,
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
    >
      <Button
        variant="outlined"
        onClick={onPreviousStep}
        disabled={currentStep <= 1}
        sx={{ minWidth: '120px' }}
      >
        Previous Step
      </Button>

      <Box textAlign="center">
        <span style={{ fontSize: '14px', color: '#666' }}>
          Step {currentStep} of {totalSteps}
        </span>
      </Box>

      <Button
        variant="contained"
        onClick={onNextStep}
        disabled={!canProceedNext}
        sx={{
          minWidth: '120px',
          backgroundColor: canProceedNext ? '#87ceeb' : '#ccc',
          '&:hover': {
            backgroundColor: canProceedNext ? '#5bb3d1' : '#ccc'
          }
        }}
      >
        Next Step
      </Button>
    </Box>
  );
}