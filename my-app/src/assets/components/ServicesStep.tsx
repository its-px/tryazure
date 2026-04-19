import { Box, Chip, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { fetchServices, type Service } from "./servicesService";
import { getComponentColors } from "../../theme";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";

interface ServicesStepProps {
  selectedServices: string[];
  onServiceToggle: (serviceId: string) => void;
}

export default function ServicesStep({
  selectedServices,
  onServiceToggle,
}: ServicesStepProps) {
  const colors = useResolvedColors();
  const { tenant } = useTenantContext();
  const componentColors = getComponentColors(colors);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadServices = () => {
      if (!tenant?.id) {
        console.log("[ServicesStep] Tenant not ready, skipping services load");
        setServices([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log("[ServicesStep] Loading services for tenant:", tenant.id);

      // Load services with timeout
      const timeout = new Promise<Service[]>((_, reject) =>
        setTimeout(() => reject(new Error("Services load timeout")), 8000),
      );

      Promise.race([fetchServices(tenant.id), timeout])
        .then((data) => {
          if (isMounted) {
            console.log("[ServicesStep] Services loaded:", data.length);
            setServices(data);
          }
        })
        .catch((err) => {
          console.error("[ServicesStep] Error loading services:", err);
          if (isMounted) {
            setServices([]);
          }
        })
        .finally(() => {
          if (isMounted) {
            console.log("[ServicesStep] Setting loading to false");
            setLoading(false);
          }
        });
    };

    loadServices();

    return () => {
      isMounted = false;
    };
  }, [tenant?.id]);

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
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  if (services.length === 0) {
    return (
      <Box textAlign="center" padding={4}>
        <h3 style={{ color: colors.text.secondary }}>No services available</h3>
        <p style={{ color: colors.text.tertiary }}>
          Please contact the administrator
        </p>
      </Box>
    );
  }
  return (
    <Box textAlign="center" padding={4}>
      <h3 style={{ marginBottom: "20px", color: colors.text.primary }}>
        Select Services
      </h3>
      <p style={{ marginBottom: "30px", color: colors.text.secondary }}>
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
                border: isSelected
                  ? `3px solid ${componentColors.serviceCard.selectedBorder}`
                  : `2px solid ${componentColors.serviceCard.border}`,
                borderRadius: "15px",
                padding: 3,
                cursor: "pointer",
                minWidth: "200px",
                maxWidth: "220px",
                backgroundColor: isSelected
                  ? componentColors.serviceCard.selected
                  : componentColors.serviceCard.background,
                transition: "all 0.3s ease",
                "&:hover": {
                  backgroundColor: isSelected
                    ? componentColors.serviceCard.selected
                    : colors.background.card,
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                },
              }}
            >
              <h4 style={{ margin: "0 0 10px 0", color: colors.text.primary }}>
                {service.name}
              </h4>
              <p
                style={{
                  margin: "0 0 8px 0",
                  color: colors.text.secondary,
                  fontSize: "14px",
                }}
              >
                {service.description || "No description available"}
              </p>
              <p style={{ margin: "0 0 8px 0", color: colors.text.secondary }}>
                <strong>Duration:</strong> {service.duration_minutes} min
              </p>
              <p
                style={{
                  margin: 0,
                  color: colors.text.primary,
                  fontWeight: "bold",
                }}
              >
                ${service.price}
              </p>

              {isSelected && (
                <Chip
                  label="Selected"
                  size="small"
                  sx={{
                    mt: 1,
                    backgroundColor: componentColors.serviceCard.selected,
                    color: colors.text.primary,
                  }}
                />
              )}
            </Box>
          );
        })}
      </Box>

      <p
        style={{
          marginTop: "20px",
          color: colors.text.primary,
          fontWeight: "bold",
        }}
      >
        Selected: {selectedServices.length} service(s)
      </p>
    </Box>
  );
}
