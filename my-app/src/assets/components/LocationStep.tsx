import { Box } from "@mui/material";
//import { colors, commonStyles } from "../../theme";


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
      <h3 style={{ marginBottom: '30px', color: '#979696ff' }}>
        Where would you like your appointment?
      </h3>
      
      <Box display="flex" gap={4} justifyContent="center">
        {/* Your Place Option */}
        <Box
          onClick={() => onLocationSelect('your_place')}
          sx={{
            border: selectedLocation === 'your_place' ? '3px solid #1b5e20' : '2px solid #1b5e20',
            borderRadius: '15px',
            padding: 4,
            cursor: 'pointer',
            minWidth: '250px',
            backgroundColor: selectedLocation === 'your_place' ? '#2d2d2d' : '#2d2d2d',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'your_place' ? '#2d2d2d' : '#2d2d2d',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#d9e2eaff' }}>
            Appointment at Your Place
          </h4>
          <p style={{ margin: 0, color: '#979696ff' }}>
            We come to your location
          </p>
        </Box>

        {/* Our Place Option */}
        <Box
          onClick={() => onLocationSelect('our_place')}
          sx={{
            border: selectedLocation === 'our_place' ? '3px solid #1b5e20' : '2px solid #1b5e20',
            borderRadius: '15px',
            padding: 4,
            cursor: 'pointer',
            minWidth: '250px',
            backgroundColor: selectedLocation === 'our_place' ? '#2d2d2d' : '#2d2d2d',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'our_place' ? '#2d2d2d' : '#2d2d2d',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }
          }}
        >
          <h4 style={{ margin: '0 0 10px 0', color: '#d9e2eaff' }}>
            Appointment at Our Place
          </h4>
          <p style={{ margin: 0, color: '#979696ff' }}>
            Visit our location
          </p>
        </Box>
      </Box>
    </Box>
  );
}