import { useState } from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import { Phone, Room } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";

interface BusinessInfo {
  address?: string;
  phone?: string;
  lat?: number | null;
  lng?: number | null;
  hours?: { day: string; hours: string }[];
  healthSafety?: string[];
}

export default function InfoPage() {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const { tenant } = useTenantContext();
  // Only what the owner filled in — each section hides when its data is missing.
  const info = (tenant?.config?.businessInfo ?? {}) as BusinessInfo;
  const address = info.address?.trim();
  const hours = info.hours?.filter((h) => h.hours?.trim()) ?? [];
  // BusinessSettings saves blank days as "Closed", so all-Closed means "not filled in".
  const showHours = hours.some((h) => h.hours.trim() !== "Closed");
  const healthSafety = info.healthSafety?.filter((r) => r.trim()) ?? [];
  // Owners edit the address, not coordinates (BusinessSettings clears lat/lng on change).
  const mapQuery =
    info.lat != null && info.lng != null
      ? `${info.lat},${info.lng}`
      : address
        ? encodeURIComponent(address)
        : null;
  const mapSrc = `https://www.google.com/maps?q=${mapQuery}&z=16&output=embed`;
  // The embed sends the visitor's IP to Google, so it loads only on request (GDPR).
  const [showMap, setShowMap] = useState(false);
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
      {mapQuery && (
      <Box textAlign="center" mt={3}>
        <Paper elevation={3} sx={{ borderRadius: 2, overflow: "hidden" }}>
          {showMap ? (
            <iframe
              title={t("info.map")}
              src={mapSrc}
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <Box sx={{ height: 250, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1, p: 2 }}>
              <Button variant="outlined" onClick={() => setShowMap(true)}>{t("info.show_map")}</Button>
              <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                {t("info.map_privacy")}
              </Typography>
            </Box>
          )}
          <Button
            startIcon={<Room />}
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener"
            sx={{ mt: 1, color: colors.accent.main }}
          >
            {t("info.directions")}
          </Button>
        </Paper>
      </Box>
      )}

      {/* Business Info */}
      <Box textAlign="center" mt={4}>
        <Typography variant="h5">{tenant?.name}</Typography>
        {address && (
          <Typography variant="body2" sx={{ color: colors.text.secondary }}>
            {address}
          </Typography>
        )}
        {info.phone?.trim() && (
          <Button
            startIcon={<Phone />}
            variant="contained"
            href={`tel:${info.phone.trim()}`}
            sx={{
              mt: 2,
              backgroundColor: colors.accent.main,
              "&:hover": { backgroundColor: colors.accent.hover },
            }}
          >
            {t("info.call")}
          </Button>
        )}
      </Box>

      {/* Business Hours */}
      {showHours && (
      <Box mt={5}>
        <Typography variant="h6" textAlign="center">
          {t("info.business_hours")}
        </Typography>
        <Box sx={{ maxWidth: 400, mx: "auto", mt: 2 }}>
          {hours.map((item, idx) => (
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
              <Typography>{t(`days.${item.day}`, { defaultValue: item.day })}</Typography>
              <Typography>{item.hours.trim() === "Closed" ? t("info.closed") : item.hours}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
      )}

      {/* Health & Safety */}
      {healthSafety.length > 0 && (
      <Box mt={5} textAlign="center">
        <Typography variant="h6">{t("info.health_safety")}</Typography>
        <Box mt={2} sx={{ maxWidth: 400, mx: "auto", textAlign: "left" }}>
          <ul>
            {healthSafety.map((rule, idx) => (
              <li key={idx}>{rule}</li>
            ))}
          </ul>
        </Box>
      </Box>
      )}
    </Box>
  );
}
