import { Box, Button, Typography, Paper } from "@mui/material";
import { Phone, Room } from "@mui/icons-material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";

// ponytail: fallback defaults if tenant.config.businessInfo is unset
const DEFAULT_INFO = {
  name: "Name's Company",
  address: "Πεικων 22, Νεο Ηράκλειο, Greece, 14451",
  phone: "",
  lat: 38.00856262005867,
  lng: 23.820820724187612,
  hours: [
    { day: "Monday", hours: "Closed" },
    { day: "Tuesday", hours: "10:00 - 20:00" },
    { day: "Wednesday", hours: "10:00 - 18:00" },
    { day: "Thursday", hours: "10:00 - 22:00" },
    { day: "Friday", hours: "10:00 - 20:00" },
    { day: "Saturday", hours: "09:00 - 18:00" },
    { day: "Sunday", hours: "12:00 - 17:00" },
  ],
  healthSafety: [
    "Employees wear masks",
    "Employees wear disposable gloves",
    "Disinfection of all surfaces in the workplace",
    "Disinfection between clients",
    "Maintain social distancing",
  ],
};

export default function InfoPage() {
  const colors = useResolvedColors();
  const { tenant } = useTenantContext();
  const info = {
    ...DEFAULT_INFO,
    ...(tenant?.config?.businessInfo as Partial<typeof DEFAULT_INFO>),
  };
  const mapSrc = `https://www.google.com/maps?q=${info.lat},${info.lng}&z=16&output=embed`;
  return (
    <Box
      sx={{
        backgroundColor: colors.background.dark,
        color: colors.text.primary,
        minHeight: "100vh",
        p: 3,
      }}
    >
      {/* Banner */}
      {/* <Box textAlign="center" mt={3}>
        <Box
          component="img"
          src="/petsas_banner.png"
          alt="Banner"
          sx={{
            width: "100%",
            maxHeight: 200,
            objectFit: "cover",
            borderRadius: 2,
          }}
        />
      </Box> */}

      {/* Map */}
      <Box textAlign="center" mt={3}>
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
          <iframe
            src={mapSrc}
            width="100%"
            height="250"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <Button
            startIcon={<Room />}
            sx={{ mt: 1, color: colors.accent.main }}
          >
            Directions
          </Button>
        </Paper>
      </Box>

      {/* Business Info */}
      <Box textAlign="center" mt={4}>
        <Typography variant="h5">{info.name}</Typography>
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          {info.address}
        </Typography>
        {/* Call button */}
        <Button
          startIcon={<Phone />}
          variant="contained"
          href={info.phone ? `tel:${info.phone}` : undefined}
          sx={{
            mt: 2,
            backgroundColor: colors.accent.main,
            "&:hover": { backgroundColor: colors.accent.hover },
          }}
        >
          Call
        </Button>
      </Box>

      {/* Business Hours */}
      <Box mt={5}>
        <Typography variant="h6" textAlign="center">
          Business Hours
        </Typography>
        <Box sx={{ maxWidth: 400, mx: "auto", mt: 2 }}>
          {info.hours.map((item, idx) => (
            <Box
              key={idx}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                p: 1,
                bgcolor:
                  idx % 2 === 0 ? colors.background.medium : "transparent",
              }}
            >
              <Typography>{item.day}</Typography>
              <Typography>{item.hours}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Health & Safety */}
      <Box mt={5} textAlign="center">
        <Typography variant="h6">Venue Health and Safety Rules</Typography>
        <Box mt={2} sx={{ maxWidth: 400, mx: "auto", textAlign: "left" }}>
          <ul>
            {info.healthSafety.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </Box>
      </Box>
    </Box>
  );
}
