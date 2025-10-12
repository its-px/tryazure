import { Box, Chip } from "@mui/material";
import { colors } from "../../theme";

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
    id: 'prof1', 
    name: 'Person 1', 
    specialties: ['Service 1', 'Service 2'] 
  },
  { 
    id: 'prof2', 
    name: 'Person 2', 
    specialties: ['Service 3', 'Service 4'] 
  },
];

export default function ProfessionalStep({
  selectedProfessional,
  onProfessionalSelect
}: ProfessionalStepProps) {
  return (
    <Box 
      textAlign="center" 
      padding={{ xs: 2, sm: 3, md: 4 }}
      sx={{
        backgroundColor: colors.background.dark,
        minHeight: '100vh',
      }}
    >
      <h3 style={{ 
        marginBottom: '30px', 
        color: '#979696ff',
        fontSize: window.innerWidth < 600 ? '1.25rem' : '1.5rem',
      }}>
        Choose Your Professional
      </h3>
      
      <Box 
        display="flex" 
        gap={{ xs: 2, sm: 3, md: 4 }}
        justifyContent="center"
        flexDirection={{ xs: 'column', sm: 'row' }} // Stack on mobile, row on desktop
        alignItems="center"
        sx={{
          maxWidth: '800px',
          margin: '0 auto',
        }}
      >
        {PROFESSIONALS.map((professional) => {
          const isSelected = selectedProfessional === professional.id;
          
          return (
            <Box
              key={professional.id}
              onClick={() => onProfessionalSelect(professional.id)}
              sx={{
                border: isSelected ? '3px solid #1b5e20' : '2px solid #555',
                borderRadius: '15px',
                padding: { xs: 3, sm: 4 },
                cursor: 'pointer',
                width: { xs: '100%', sm: 'auto' },
                minWidth: { xs: '100%', sm: '250px' },
                maxWidth: { xs: '100%', sm: '350px' },
                backgroundColor: isSelected ? '#2d2d2d' : '#2d2d2d',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: isSelected ? '#646262ff' : '#3a3a3a',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                },
                '&:active': {
                  transform: 'scale(0.98)',
                }
              }}
            >
              <h4 style={{ 
                margin: '0 0 15px 0', 
                color: '#d9e2eaff',
                fontSize: window.innerWidth < 600 ? '1.1rem' : '1.25rem',
              }}>
                {professional.name}
              </h4>
              <p style={{ 
                margin: '0 0 10px 0', 
                color: '#b0b2b0',
                fontSize: window.innerWidth < 600 ? '0.875rem' : '1rem',
              }}>
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
                      color: '#979696ff',
                      borderColor: colors.accent.main,
                      fontSize: { xs: '0.7rem', sm: '0.8125rem' },
                      height: { xs: '24px', sm: '28px' },
                      '& .MuiChip-label': {
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
                    backgroundColor: colors.accent.main,
                    color: colors.text.primary,
                    fontWeight: 'bold',
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
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