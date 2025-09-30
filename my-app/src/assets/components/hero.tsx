import { Box, IconButton, Typography } from "@mui/material";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function Hero() {
 return (
    <Box
      display="flex"
      justifyContent="space-around"
      alignItems="center"
      sx={{
        backgroundColor: "#1e1e1e",
        padding: 4,
      }}
    >
      {/* Book Appointment */}
      <Box textAlign="center">
        <IconButton
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: 80,
            height: 80,
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <CalendarTodayIcon fontSize="large" />
        </IconButton>
        <Typography variant="body1" sx={{ color: "white" }}>
          Book Appointment
        </Typography>
      </Box>

      {/* Business Infos */}
      <Box textAlign="center">
        <IconButton
          sx={{
            backgroundColor: "#2e7d32",
            color: "white",
            width: 80,
            height: 80,
            mb: 1,
            "&:hover": { backgroundColor: "#388e3c" },
          }}
        >
          <InfoIcon fontSize="large" />
        </IconButton>
        <Typography variant="body1" sx={{ color: "white" }}>
          Business Infos
        </Typography>
      </Box>

      {/* Logo in the middle */}
      <Box textAlign="center">
        <Box
          component="img"
          src="/your-logo.png"
          alt="Logo"
          sx={{
            width: 200, // 👈 increase size here
            height: 200,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      </Box>

      {/* QR Code */}
      <Box textAlign="center">
        <IconButton
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: 80,
            height: 80,
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <QrCodeIcon fontSize="large" />
        </IconButton>
        <Typography variant="body1" sx={{ color: "white" }}>
          QR Code
        </Typography>
      </Box>

      {/* User Account */}
      <Box textAlign="center">
        <IconButton
          sx={{
            backgroundColor: "#333",
            color: "white",
            width: 80,
            height: 80,
            mb: 1,
            "&:hover": { backgroundColor: "#555" },
          }}
        >
          <AccountCircleIcon fontSize="large" />
        </IconButton>
        <Typography variant="body1" sx={{ color: "white" }}>
          User Account
        </Typography>
      </Box>
    </Box>
  );
}

