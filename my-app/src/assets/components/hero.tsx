import { Box, IconButton, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

interface HeroProps {
  onBookingClick: () => void;
  onInfoClick: () => void;
  onQRClick: () => void;
  onAccountClick: () => void;
}



// na ftiajo to to owner panel na lei mono to future booked dates kai edw na to ftiajo me to css kai ta themes ola se ena
 
















export default function Hero({ onBookingClick, onInfoClick, onQRClick, onAccountClick }: HeroProps) {
  return (
    <Box
      display="flex"
      justifyContent="space-around"
      alignItems="center"
      sx={{
        backgroundColor: "#1e1e1e",
        padding: { xs: 2, md: 4 },
        flexWrap: "wrap",
        gap: 2
      }}
    >
      {/* Book Appointment */}
      <Box textAlign="center">
        <IconButton
        onClick={onBookingClick}
          sx={{
            backgroundColor: "#2e7d32",
            color: "white",
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            mb: 1,
            "&:hover": { backgroundColor: "#1b5e20" },
          }}
        >
          <CalendarTodayIcon fontSize="large" />
        </IconButton>
        <Typography variant="body2" sx={{ color: "white" }}>
          Book Appointment
        </Typography>
      </Box>

      {/* Business Infos */}
      <Box textAlign="center">
        <IconButton
        onClick={onInfoClick}
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <InfoIcon fontSize="large" />
        </IconButton>
        <Typography variant="body2" sx={{ color: "white" }}>
          Business Infos
        </Typography>
      </Box>

      {/* Logo in the middle */}
    <Box textAlign="center">
  <IconButton
  // na to diorthoso na pigeneit sto homepage/booking
   onClick={onBookingClick}
    sx={{
      borderRadius: "50%",
      p: 0, // no padding
    }}
  >
    <Box
      component="img"
      src="/logo.png"
      alt="Logo"
      sx={{
        width: { xs: 120, md: 200 },
        height: { xs: 120, md: 200 },
        borderRadius: "50%",
        objectFit: "cover",
      }}
    />
  </IconButton>
</Box>

      {/* QR Code */}
      <Box textAlign="center">
        <IconButton
        onClick={onQRClick}
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <QrCodeIcon fontSize="large" />
        </IconButton>
        <Typography variant="body2" sx={{ color: "white" }}>
          QR Code
        </Typography>
      </Box>

      {/* User Account */}
      <Box textAlign="center">
        <IconButton
        onClick={onAccountClick}
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: { xs: 60, md: 80 },
            height: { xs: 60, md: 80 },
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <AccountCircleIcon fontSize="large" />
        </IconButton>
        <Typography variant="body2" sx={{ color: "white" }}>
          User Account
        </Typography>
      </Box>
    </Box>
  );
}