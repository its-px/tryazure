import { Box, Chip } from "@mui/material";

interface Professional {
  id: string;
  name: string;
  specialties: string[];
}

interface ProfessionalStepProps {
  selectedProfessional: string | null;
  onProfessionalSelect: (professionalId: string) => void;
}

// Mock professionals - you can customize these later
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
    <Box textAlign="center" padding={4}>
      <h3 style={{ marginBottom: '30px', color: '#333' }}>
        Choose Your Professional
      </h3>
      
      <Box display="flex" gap={4} justifyContent="center">
        {PROFESSIONALS.map((professional) => {
          const isSelected = selectedProfessional === professional.id;
          
          return (
            <Box
              key={professional.id}
              onClick={() => onProfessionalSelect(professional.id)}
              sx={{
                border: isSelected ? '3px solid #1976d2' : '2px solid #ddd',
                borderRadius: '15px',
                padding: 4,
                cursor: 'pointer',
                minWidth: '250px',
                backgroundColor: isSelected ? '#e3f2fd' : 'white',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}
            >
              <h4 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>
                {professional.name}
              </h4>
              <p style={{ margin: '0 0 10px 0', color: '#666' }}>
                Specialties:
              </p>
              <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center">
                {professional.specialties.map((specialty, index) => (
                  <Chip 
                    key={index}
                    label={specialty} 
                    size="small" 
                    variant="outlined"
                  />
                ))}
              </Box>
              
              {isSelected && (
                <Chip 
                  label="Selected" 
                  color="primary" 
                  sx={{ mt: 2 }}
                />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}