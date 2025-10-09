import { Box, IconButton, Typography, Menu, MenuItem, Button } from "@mui/material";
import { useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LanguageIcon from "@mui/icons-material/Language";
import { colors, commonStyles, getActiveStyle } from "./../../theme";

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
  };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: colors.background.dark,
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
            color: colors.text.primary,
            backgroundColor: colors.background.overlay,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            },
            ...commonStyles.button,
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
              backgroundColor: colors.background.medium,
              color: colors.text.primary,
            }
          }}
        >
          <MenuItem onClick={() => handleLanguageSelect("EN")}>English</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("GR")}>Ελληνικά</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("ES")}>Español</MenuItem>
          <MenuItem onClick={() => handleLanguageSelect("FR")}>Français</MenuItem>
        </Menu>

        {/* Exit Button */}
        {isLoggedIn && onExitClick && (
          <IconButton
            onClick={onExitClick}
            sx={{
              color: colors.text.primary,
              backgroundColor: colors.error.main,
              '&:hover': {
                backgroundColor: colors.error.dark,
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
              color: colors.text.primary,
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
              ...getActiveStyle(currentPage === 'booking'),
              "&:hover": { backgroundColor: colors.background.card },
            }}
          >
            <CalendarTodayIcon fontSize="large" />
          </IconButton>
          <Typography variant="body2" sx={{ color: colors.text.primary }}>
            Book Appointment
          </Typography>
        </Box>

        {/* Business Infos */}
        <Box textAlign="center">
          <IconButton
            onClick={onInfoClick}
            sx={{
              color: colors.text.primary,
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
              ...getActiveStyle(currentPage === 'info'),
              "&:hover": { backgroundColor: colors.background.card },
            }}
          >
            <InfoIcon fontSize="large" />
          </IconButton>
          <Typography variant="body2" sx={{ color: colors.text.primary }}>
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
              color: colors.text.primary,
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
              ...getActiveStyle(currentPage === 'qr'),
              "&:hover": { backgroundColor: colors.background.card },
            }}
          >
            <QrCodeIcon fontSize="large" />
          </IconButton>
          <Typography variant="body2" sx={{ color: colors.text.primary }}>
            QR Code
          </Typography>
        </Box>

        {/* User Account */}
        <Box textAlign="center">
          <IconButton
            onClick={onAccountClick}
            sx={{
              color: colors.text.primary,
              width: { xs: 60, md: 80 },
              height: { xs: 60, md: 80 },
              mb: 1,
              ...getActiveStyle(currentPage === 'account'),
              "&:hover": { backgroundColor: colors.background.card },
            }}
          >
            <AccountCircleIcon fontSize="large" />
          </IconButton>
          <Typography variant="body2" sx={{ color: colors.text.primary }}>
            User Account
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}