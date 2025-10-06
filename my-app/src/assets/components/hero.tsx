import { Box, IconButton, Typography, Menu, MenuItem, Button } from "@mui/material";
import { useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LanguageIcon from "@mui/icons-material/Language";

interface HeroProps {
 onBookingClick: () => void;
  onInfoClick: () => void;
  onQRClick: () => void;
  onAccountClick: () => void;
  onExitClick?: () => void;
  isLoggedIn?: boolean;
  currentPage: 'booking' | 'info' | 'qr' | 'account';
  
  
}

export default function Hero({ 
 onBookingClick, 
  onInfoClick, 
  onQRClick, 
  onAccountClick,
  onExitClick,
  isLoggedIn = false,
  currentPage
  
}: HeroProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("EN");

  const handleLanguageClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleLanguageClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    handleLanguageClose();
    // You can add language change logic here in the future
  };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: "#1e1e1e",
        padding: { xs: 2, md: 4 },
        width: '100%',
        margin: 0,
      }}
    >
      {/* Top Right Controls */}
      <Box
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          display: 'flex',
          gap: 1,
          alignItems: 'center',
          zIndex: 10
        }}
      >
        {/* Language Dropdown */}
        <Button
          onClick={handleLanguageClick}
          startIcon={<LanguageIcon />}
          sx={{
            color: 'white',
            backgroundColor: 'rgba(124, 59, 59, 0.1)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            borderRadius: '20px',
            padding: '6px 16px',
          }}
        >
          {selectedLanguage}
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleLanguageClose}
          PaperProps={{
            sx: {
              backgroundColor: '#2e2e2e',
              color: 'white',
            }
          }}
        >
          <MenuItem onClick={() => handleLanguageSelect("EN")}>English</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("GR")}>Ελληνικά</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("ES")}>Español</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("FR")}>Français</MenuItem>
        </Menu>

        {/* Exit Button (only show when logged in) */}
        {isLoggedIn && onExitClick && (
          <IconButton
            onClick={onExitClick}
            sx={{
              color: 'white',
              backgroundColor: '#d32f2f',
              '&:hover': {
                backgroundColor: '#b71c1c',
              },
              width: 40,
              height: 40,
            }}
          >
            <ExitToAppIcon />
          </IconButton>
        )}
      </Box>

      {/* Main Navigation */}
      <Box
        display="flex"
        justifyContent="space-around"
        alignItems="center"
        sx={{
          flexWrap: "wrap",
          gap: 2,
          mt: { xs: 6, md: 0 },
        }}
      >
        {/* Book Appointment */}
        <Box textAlign="center">
          <IconButton
            onClick={onBookingClick}
            sx={{
              color: "white",
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
              backgroundColor: currentPage==='booking' ? '#0dc4edff' : '#555555ff',
              fontWeight: currentPage==='booking' ? 'bold' : 'normal',

              "&:hover": { backgroundColor: "#555" },
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
              
              color: "white",
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
               backgroundColor: currentPage==='info' ? '#0dc4edff' : '#555555ff',
              fontWeight: currentPage==='info' ? 'bold' : 'normal',
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
            onClick={onBookingClick}
            sx={{
              borderRadius: "50%",
              p: 0,
              
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
              
              color: "white",
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
               backgroundColor: currentPage==='qr' ? '#0dc4edff' : '#555555ff',
              fontWeight: currentPage==='qr' ? 'bold' : 'normal',
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
              
              color: "white",
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
               backgroundColor: currentPage==='account' ? '#0dc4edff' : '#555555ff',
              fontWeight: currentPage==='account' ? 'bold' : 'normal',
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
    </Box>
  );
}