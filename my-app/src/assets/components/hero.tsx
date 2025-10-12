import { Box, IconButton, Typography, Menu, MenuItem, Button } from "@mui/material";
import { useState } from "react";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import LanguageIcon from "@mui/icons-material/Language";
import { colors, commonStyles, getActiveStyle } from "../../theme";

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
    <>
      {/* Desktop/Tablet Navigation - Hidden on mobile */}
      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'relative',
          backgroundColor: colors.background.dark,
          padding: { sm: 3, md: 4 },
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

        {/* Main Navigation - Desktop */}
        <Box
          display="flex"
          justifyContent="space-around"
          alignItems="center"
          sx={{
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          {/* Book Appointment */}
          <Box textAlign="center">
            <IconButton
              onClick={onBookingClick}
              sx={{
                color: colors.text.primary,
                width: 80,
                height: 80,
                mb: 1,
                ...getActiveStyle(currentPage === 'booking'),
                "&:hover": { backgroundColor: colors.background.card },
              }}
            >
              <CalendarTodayIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <Typography variant="body2" sx={{ color: colors.text.primary, fontSize: '0.875rem' }}>
              Book Appointment
            </Typography>
          </Box>

          {/* Business Infos */}
          <Box textAlign="center">
            <IconButton
              onClick={onInfoClick}
              sx={{
                color: colors.text.primary,
                width: 80,
                height: 80,
                mb: 1,
                ...getActiveStyle(currentPage === 'info'),
                "&:hover": { backgroundColor: colors.background.card },
              }}
            >
              <InfoIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <Typography variant="body2" sx={{ color: colors.text.primary, fontSize: '0.875rem' }}>
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
                  width: 200,
                  height: 200,
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
                width: 80,
                height: 80,
                mb: 1,
                ...getActiveStyle(currentPage === 'qr'),
                "&:hover": { backgroundColor: colors.background.card },
              }}
            >
              <QrCodeIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <Typography variant="body2" sx={{ color: colors.text.primary, fontSize: '0.875rem' }}>
              QR Code
            </Typography>
          </Box>

          {/* User Account */}
          <Box textAlign="center">
            <IconButton
              onClick={onAccountClick}
              sx={{
                color: colors.text.primary,
                width: 80,
                height: 80,
                mb: 1,
                ...getActiveStyle(currentPage === 'account'),
                "&:hover": { backgroundColor: colors.background.card },
              }}
            >
              <AccountCircleIcon sx={{ fontSize: '2rem' }} />
            </IconButton>
            <Typography variant="body2" sx={{ color: colors.text.primary, fontSize: '0.875rem' }}>
              User Account
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Mobile Top Bar - Hidden completely on mobile */}
      <Box
        sx={{
          display: 'none', // Completely hidden on mobile
        }}
      >
      </Box>

      {/* Mobile Bottom Navigation */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.background.dark,
          borderTop: `1px solid ${colors.border.main}`,
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0',
          zIndex: 1000,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.3)',
        }}
      >
        {/* Book Appointment */}
        <IconButton
          onClick={onBookingClick}
          sx={{
            flexDirection: 'column',
            color: colors.text.primary,
            borderRadius: '8px',
            padding: '8px 12px',
            ...getActiveStyle(currentPage === 'booking'),
            '&:hover': { backgroundColor: colors.background.card },
          }}
        >
          <CalendarTodayIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>

        {/* Business Infos */}
        <IconButton
          onClick={onInfoClick}
          sx={{
            flexDirection: 'column',
            color: colors.text.primary,
            borderRadius: '8px',
            padding: '8px 12px',
            ...getActiveStyle(currentPage === 'info'),
            '&:hover': { backgroundColor: colors.background.card },
          }}
        >
          <InfoIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>

        {/* QR Code */}
        <IconButton
          onClick={onQRClick}
          sx={{
            flexDirection: 'column',
            color: colors.text.primary,
            borderRadius: '8px',
            padding: '8px 12px',
            ...getActiveStyle(currentPage === 'qr'),
            '&:hover': { backgroundColor: colors.background.card },
          }}
        >
          <QrCodeIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>

        {/* User Account */}
        <IconButton
          onClick={onAccountClick}
          sx={{
            flexDirection: 'column',
            color: colors.text.primary,
            borderRadius: '8px',
            padding: '8px 12px',
            ...getActiveStyle(currentPage === 'account'),
            '&:hover': { backgroundColor: colors.background.card },
          }}
        >
          <AccountCircleIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>

        {/* Language Selector - Mobile */}
        <IconButton
          onClick={handleLanguageClick}
          sx={{
            flexDirection: 'column',
            color: colors.text.primary,
            borderRadius: '8px',
            padding: '8px 12px',
          }}
        >
          <LanguageIcon sx={{ fontSize: '1.5rem' }} />
        </IconButton>
      </Box>

      {/* Add padding to bottom of content on mobile to account for fixed nav */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, height: '70px' }} />
    </>
  );
}