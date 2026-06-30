import { Box, Menu, MenuItem } from "@mui/material";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../../configureStore";
import { toggleTheme } from "../../slices/themeSlice";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import LanguageIcon from "@mui/icons-material/Language";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import InfoIcon from "@mui/icons-material/Info";
import QrCodeIcon from "@mui/icons-material/QrCode";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";

interface HeroProps {
  onBookingClick: () => void;
  onInfoClick: () => void;
  onQRClick: () => void;
  onAccountClick: () => void;
  onExitClick?: () => void;
  isLoggedIn?: boolean;
  currentPage: "booking" | "info" | "qr" | "account";
}

export default function Hero({
  onBookingClick,
  onInfoClick,
  onQRClick,
  onAccountClick,
  currentPage,
}: HeroProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState(
    i18n.language?.toUpperCase() || "EN",
  );
  const dispatch = useDispatch();
  const themeMode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = useResolvedColors();
  const { logoUrl, tenant } = useTenantContext();

  useEffect(() => {
    try { localStorage.setItem("themeMode", themeMode); } catch { /* ignore */ }
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", themeMode);
    }
  }, [themeMode]);

  useEffect(() => {
    setSelectedLanguage(i18n.language?.toUpperCase() || "EN");
  }, [i18n.language]);

  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    i18n.changeLanguage(lang.toLowerCase());
    setAnchorEl(null);
  };

  const navItems = [
    { key: "booking",  icon: <CalendarTodayIcon sx={{ fontSize: 22 }} />, onClick: onBookingClick },
    { key: "info",     icon: <InfoIcon sx={{ fontSize: 22 }} />,          onClick: onInfoClick },
    { key: "qr",       icon: <QrCodeIcon sx={{ fontSize: 22 }} />,        onClick: onQRClick },
    { key: "account",  icon: <AccountCircleIcon sx={{ fontSize: 22 }} />, onClick: onAccountClick },
  ] as const;

  return (
    <>
      {/* ── Top bar ── */}
      <Box
        component="header"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: colors.background.medium,
          borderBottom: `1px solid ${colors.border.main}`,
          px: { xs: 2.5, md: 4 },
          py: { xs: 1.5, md: 2 },
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Language selector */}
        <Box
          component="button"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex", alignItems: "center", gap: 0.5,
            background: "none", border: "none", cursor: "pointer",
            color: colors.text.secondary, p: 1, borderRadius: "10px",
            fontSize: 13, fontFamily: "inherit",
            "&:hover": { color: colors.text.primary, background: colors.background.card },
          }}
        >
          <LanguageIcon sx={{ fontSize: 20 }} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>{selectedLanguage}</span>
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { backgroundColor: colors.background.medium, color: colors.text.primary },
          }}
        >
          {[["EN","English"],["GR","Ελληνικά"],["ES","Español"],["FR","Français"]].map(([code, label]) => (
            <MenuItem key={code} onClick={() => handleLanguageSelect(code)}>{label}</MenuItem>
          ))}
        </Menu>

        {/* Logo */}
        <Box
          component="button"
          onClick={onBookingClick}
          sx={{
            width: 56, height: 56,
            borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid ${colors.accent.main}`,
            boxShadow: `0 0 20px ${colors.background.overlay}`,
            cursor: "pointer",
            background: "none",
            p: 0,
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={logoUrl}
            alt={tenant?.name ?? "Logo"}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              e.currentTarget.src = "/logo.png";
            }}
            sx={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Box>

        {/* Theme toggle */}
        <Box
          component="button"
          onClick={() => dispatch(toggleTheme())}
          aria-label="toggle theme"
          sx={{
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "none", border: "none", cursor: "pointer",
            color: colors.text.secondary, p: 1, borderRadius: "10px",
            "&:hover": { color: colors.text.primary, background: colors.background.card },
          }}
        >
          {themeMode === "dark"
            ? <Brightness7Icon sx={{ fontSize: 20 }} />
            : <Brightness4Icon sx={{ fontSize: 20 }} />}
        </Box>
      </Box>

      {/* ── Desktop nav row (md+) — shown below top bar ── */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          justifyContent: "center",
          gap: 4,
          py: 1.5,
          backgroundColor: colors.background.medium,
          borderBottom: `1px solid ${colors.border.main}`,
        }}
      >
        {navItems.map(({ key, icon, onClick }) => {
          const active = currentPage === key;
          return (
            <Box
              key={key}
              component="button"
              onClick={onClick}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                background: "none", border: "none", cursor: "pointer",
                color: active ? colors.accent.light : colors.text.secondary,
                fontFamily: "inherit", fontSize: 10, fontWeight: 500,
                px: 2, py: 1, borderRadius: "10px",
                borderBottom: active ? `2px solid ${colors.accent.main}` : "2px solid transparent",
                "&:hover": { color: colors.text.primary },
              }}
            >
              {icon}
            </Box>
          );
        })}
      </Box>

      {/* ── Mobile bottom nav ── */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          bottom: 0, left: 0, right: 0,
          backgroundColor: `${colors.background.dark}eb`,
          backdropFilter: "blur(16px)",
          borderTop: `1px solid ${colors.border.main}`,
          justifyContent: "space-around",
          alignItems: "center",
          py: 1.25,
          zIndex: 1000,
          boxShadow: "0 -2px 10px rgba(0,0,0,0.3)",
        }}
      >
        {navItems.map(({ key, icon, onClick }) => {
          const active = currentPage === key;
          return (
            <Box
              key={key}
              component="button"
              onClick={onClick}
              sx={{
                display: "flex", flexDirection: "column", alignItems: "center",
                background: "none", border: "none", cursor: "pointer",
                color: active ? colors.accent.light : colors.text.tertiary,
                p: 1, borderRadius: "10px",
                transition: "color 0.2s",
              }}
            >
              {icon}
            </Box>
          );
        })}
      </Box>

      {/* Mobile bottom nav spacer */}
      <Box sx={{ display: { xs: "block", md: "none" }, height: "64px" }} />
    </>
  );
}
