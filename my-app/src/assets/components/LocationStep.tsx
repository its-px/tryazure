import { Box } from "@mui/material";
import { colors } from "../../theme";

interface LocationStepProps {
  selectedLocation: 'your_place' | 'our_place' | null;  
  onLocationSelect: (location: 'your_place' | 'our_place') => void;
}

export default function LocationStep({
  selectedLocation,
  onLocationSelect
}: LocationStepProps) {
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
        Where would you like your appointment?
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
        {/* Your Place Option */}
        <Box
          onClick={() => onLocationSelect('your_place')}
          sx={{
            border: selectedLocation === 'your_place' ? '3px solid #1b5e20' : '2px solid #1b5e20',
            borderRadius: '15px',
            padding: { xs: 3, sm: 4 },
            cursor: 'pointer',
            width: { xs: '100%', sm: 'auto' },
            minWidth: { xs: '100%', sm: '250px' },
            maxWidth: { xs: '100%', sm: '350px' },
            backgroundColor: selectedLocation === 'your_place' ? '#2d2d2d' : '#2d2d2d',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'your_place' ? '#2d2d2d' : '#2d2d2d',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            },
            '&:active': {
              transform: 'scale(0.98)',
            }
          }}
        >
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: '#d9e2eaff',
            fontSize: window.innerWidth < 600 ? '1.1rem' : '1.25rem',
          }}>
            Appointment at Your Place
          </h4>
          <p style={{ 
            margin: 0, 
            color: '#979696ff',
            fontSize: window.innerWidth < 600 ? '0.875rem' : '1rem',
          }}>
            We come to your location
          </p>
        </Box>

        {/* Our Place Option */}
        <Box
          onClick={() => onLocationSelect('our_place')}
          sx={{
            border: selectedLocation === 'our_place' ? '3px solid #1b5e20' : '2px solid #1b5e20',
            borderRadius: '15px',
            padding: { xs: 3, sm: 4 },
            cursor: 'pointer',
            width: { xs: '100%', sm: 'auto' },
            minWidth: { xs: '100%', sm: '250px' },
            maxWidth: { xs: '100%', sm: '350px' },
            backgroundColor: selectedLocation === 'our_place' ? '#2d2d2d' : '#2d2d2d',
            transition: 'all 0.3s ease',
            '&:hover': { 
              backgroundColor: selectedLocation === 'our_place' ? '#2d2d2d' : '#2d2d2d',
              transform: 'translateY(-2px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            },
            '&:active': {
              transform: 'scale(0.98)',
            }
          }}
        >
          <h4 style={{ 
            margin: '0 0 10px 0', 
            color: '#d9e2eaff',
            fontSize: window.innerWidth < 600 ? '1.1rem' : '1.25rem',
          }}>
            Appointment at Our Place
          </h4>
          <p style={{ 
            margin: 0, 
            color: '#979696ff',
            fontSize: window.innerWidth < 600 ? '0.875rem' : '1rem',
          }}>
            Visit our location
          </p>
        </Box>
      </Box>
    </Box>
  );
}