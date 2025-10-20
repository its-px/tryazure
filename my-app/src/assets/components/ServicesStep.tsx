import { Box, Chip, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchServices, type Service } from "./servicesService";

interface ServicesStepProps {
  selectedServices: string[];
  onServiceToggle: (serviceId: string) => void;
}

export default function ServicesStep({
  selectedServices,
  onServiceToggle
}: ServicesStepProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      const data = await fetchServices();
      setServices(data);
      setLoading(false);
    };

    loadServices();
  }, []);

  if (loading) {
    return (
      <Box
        textAlign="center"
        padding={4}
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box textAlign="center" padding={4}>
        <h3 style={{ color: '#666' }}>No services available</h3>
        <p style={{ color: '#999' }}>Please contact the administrator</p>
      </Box>
    );
  }
  return (
    <Box textAlign="center" padding={4}>
      <h3 style={{ marginBottom: '20px', color: '#333' }}>
        Select Services
      </h3>
      <p style={{ marginBottom: '30px', color: '#666' }}>
        Choose at least one service (you can select multiple)
      </p>

      <Box display="flex" gap={3} justifyContent="center" flexWrap="wrap">
        {services.map((service: Service) => {
          const isSelected = selectedServices.includes(service.id);
          
          return (
            <Box
              key={service.id}
              onClick={() => onServiceToggle(service.id)}
              sx={{
                border: isSelected ? '3px solid #1b5e20' : '2px solid #add',
                borderRadius: '15px',
                padding: 3,
                cursor: 'pointer',
                minWidth: '200px',
                maxWidth: '220px',
                backgroundColor: isSelected ? '#2d2d2d' : '#2d2d2d',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  backgroundColor: isSelected ? '#646262ff' : '#2d9c348f',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }
              }}
            >
              <h4 style={{ margin: '0 0 10px 0', color: '#979696ff' }}>
                {service.name}
              </h4>
              <p style={{ margin: '0 0 8px 0', color: '#b0b2b072', fontSize: '14px' }}>
                {service.description || 'No description available'}
              </p>
              <p style={{ margin: '0 0 8px 0', color: '#5c5b5bff' }}>
                <strong>Duration:</strong> {service.duration_minutes} min
              </p>
              <p style={{ margin: 0, color: '#979696ff', fontWeight: 'bold' }}>
                ${service.price}
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