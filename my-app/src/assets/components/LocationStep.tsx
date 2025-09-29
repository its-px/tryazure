import { Box } from "@mui/material";

interface LocationStepProps {
  selectedLocation: 'your_place' | 'our_place' | null;
  onLocationSelect: (location: 'your_place' | 'our_place') => void;
}

export default function LocationStep({
  selectedLocation,
  onLocationSelect
}: LocationStepProps) {
  return (
    <Box textAlign="center" padding={4}>
      <h3 style={{ marginBottom: '30px', color: '#333' }}>
        Where would you like your appointment?
      </h3>
      
      <Box display="flex" gap={4} justifyContent="center">
        {/* Your Place Option */}
        <Box
          onClick={() => onLocationSelect('your_place')}
          sx={{
            border: selectedLocation === 'your_place' ? '3px solid #1976d2' : '2px solid #ddd',
            borderRadius: '15px',
            padding: 4,
            cursor: 'pointer',
            minWidth: '250px',
            backgroundColor: selectedLocation === 'your_place' ? '#e3f2fd' : 'white',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'your_place' ? '#e3f2fd' : '#f5f5f5',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            Appointment at Your Place
          </h4>
          <p style={{ margin: 0, color: '#666' }}>
            We come to your location
          </p>
        </Box>

        {/* Our Place Option */}
        <Box
          onClick={() => onLocationSelect('our_place')}
          sx={{
            border: selectedLocation === 'our_place' ? '3px solid #1976d2' : '2px solid #ddd',
            borderRadius: '15px',
            padding: 4,
            cursor: 'pointer',
            minWidth: '250px',
            backgroundColor: selectedLocation === 'our_place' ? '#e3f2fd' : 'white',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'our_place' ? '#e3f2fd' : '#f5f5f5',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            Appointment at Our Place
          </h4>
          <p style={{ margin: 0, color: '#666' }}>
            Visit our location
          </p>
        </Box>
      </Box>
    </Box>
  );
}