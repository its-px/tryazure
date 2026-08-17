import { Avatar, Box, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchServices, type Service } from "./servicesService";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";

interface ServicesStepProps {
  selectedServices: string[];
  onServiceToggle: (serviceId: string) => void;
}

export default function ServicesStep({ selectedServices, onServiceToggle }: ServicesStepProps) {
  const colors = useResolvedColors();
  const { tenant } = useTenantContext();
  const { i18n } = useTranslation();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    if (!tenant?.id) { setServices([]); setLoading(false); return; }
    setLoading(true);
    Promise.race([
      fetchServices(tenant.id),
      new Promise<Service[]>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
    ])
      .then((data) => { if (isMounted) setServices(data); })
      .catch(() => { if (isMounted) setServices([]); })
      .finally(() => { if (isMounted) setLoading(false); });
    return () => { isMounted = false; };
  }, [tenant?.id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
        <CircularProgress sx={{ color: colors.accent.main }} />
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, pb: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: colors.accent.light, mb: 0.75 }}>
          Step 2 of 5
        </Box>
        <Box sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 300, color: colors.text.primary, lineHeight: 1.2 }}>
          <strong style={{ fontWeight: 700 }}>Pick Services</strong>
          <br />
          <span style={{ fontSize: 14, color: colors.text.secondary }}>Select one or more services</span>
        </Box>
      </Box>

      {services.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 4, color: colors.text.secondary }}>No services available</Box>
      ) : (
        services.map((service) => {
          const selected = selectedServices.includes(service.id);
          return (
            <Box
              key={service.id}
              onClick={() => onServiceToggle(service.id)}
              sx={{
                position: "relative",
                background: selected ? colors.background.card : colors.background.medium,
                border: `1px solid ${selected ? colors.accent.main : colors.border.main}`,
                borderRadius: "14px",
                p: 2.25,
                mb: 1.25,
                cursor: "pointer",
                overflow: "hidden",
                transition: "border-color 0.2s, background 0.2s, transform 0.15s",
                "&:hover": { background: colors.background.card, transform: "translateY(-1px)" },
                "&:active": { transform: "translateY(0)" },
                ...(selected && {
                  "&::after": {
                    content: '""',
                    position: "absolute", inset: 0,
                    background: colors.background.overlay,
                    borderRadius: "14px",
                    pointerEvents: "none",
                  },
                }),
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  {service.photo_icon_url && (
                    <Avatar
                      src={service.photo_icon_url}
                      variant="circular"
                      sx={{ width: 38, height: 38, flexShrink: 0 }}
                    />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ fontSize: 15, fontWeight: 600, color: colors.text.primary, mb: 0.25 }}>
                    {i18n.language?.startsWith("en") && service.name_en ? service.name_en : service.name}
                  </Box>
                    <Box sx={{ fontSize: 12, color: colors.text.secondary }}>
                      {service.duration_minutes} min
                      {service.description ? ` · ${service.description}` : ""}
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
                  <Box sx={{ fontSize: 15, fontWeight: 700, color: colors.accent.light }}>
                    {service.price ? `€${service.price}` : ""}
                  </Box>
                  <Box
                    sx={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: colors.accent.main,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: selected ? 1 : 0,
                      transform: selected ? "scale(1)" : "scale(0.5)",
                      transition: "all 0.2s",
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 14, color: "#fff" }}>check</span>
                  </Box>
                </Box>
              </Box>
            </Box>
          );
        })
      )}

      {selectedServices.length > 0 && (
        <Box sx={{ mt: 1.5, fontSize: 12, color: colors.text.secondary, textAlign: "center" }}>
          {selectedServices.length} service{selectedServices.length > 1 ? "s" : ""} selected
        </Box>
      )}
    </Box>
  );
}
