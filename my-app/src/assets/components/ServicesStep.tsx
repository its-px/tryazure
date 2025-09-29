import { Box, Chip } from "@mui/material";

interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: string;
}

interface ServicesStepProps {
  selectedServices: string[];
  onServiceToggle: (serviceId: string) => void;
}

// Mock services - you can customize these later
const SERVICES: Service[] = [
  { 
    id: 'service1', 
    name: 'Service 1', 
    description: 'Complete service package 1', 
    duration: '60 min', 
    price: '$50' 
  },
  { 
    id: 'service2', 
    name: 'Service 2', 
    description: 'Complete service package 2', 
    duration: '90 min', 
    price: '$75' 
  },
  { 
    id: 'service3', 
    name: 'Service 3', 
    description: 'Complete service package 3', 
    duration: '45 min', 
    price: '$40' 
  },
  { 
    id: 'service4', 
    name: 'Service 4', 
    description: 'Complete service package 4', 
    duration: '120 min', 
    price: '$100' 
  },
];

export default function ServicesStep({
  selectedServices,
  onServiceToggle
}: ServicesStepProps) {
  return (
    <Box textAlign="center" padding={4}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>
        Select Services
      </h3>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        Choose at least one service (you can select multiple)
      </p>
      
      <Box display="flex" gap={3} justifyContent="center" flexWrap="wrap">
        {SERVICES.map((service) => {
          const isSelected = selectedServices.includes(service.id);
          
          return (
            <Box
              key={service.id}
              onClick={() => onServiceToggle(service.id)}
              sx={{
                border: isSelected ? '3px solid #1976d2' : '2px solid #ddd',
                borderRadius: '15px',
                padding: 3,
                cursor: 'pointer',
                minWidth: '200px',
                maxWidth: '220px',
                backgroundColor: isSelected ? '#e3f2fd' : 'white',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: isSelected ? '#e3f2fd' : '#f5f5f5',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
                {service.name}
              </h4>
              <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                {service.description}
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#333' }}>
                <strong>Duration:</strong> {service.duration}
              </p>
              <p style={{ margin: 0, color: '#1976d2', fontWeight: 'bold' }}>
                {service.price}
              </p>
              
              {isSelected && (
                <Chip 
                  label="Selected" 
                  color="primary" 
                  size="small" 
                  sx={{ mt: 1 }}
                />
              )}
            </Box>
          );
        })}
      </Box>
      
      <p style={{ marginTop: '20px', color: '#333', fontWeight: 'bold' }}>
        Selected: {selectedServices.length} service(s)
      </p>
    </Box>
  );
}