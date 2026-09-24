import { Box, Link } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { openCookieSettings } from "./consent";

export default function LegalFooter() {
  const { t } = useTranslation();
  const links = ["privacy", "terms", "cookies", "imprint"] as const;
  return (
    <Box
      component="footer"
      sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 2, py: 2, fontSize: 12, opacity: 0.75 }}
    >
      {links.map((k) => (
        <Link key={k} component={RouterLink} to={`/${k}`} color="inherit" underline="hover">
          {t(`legal.${k}`)}
        </Link>
      ))}
      <Link component="button" type="button" onClick={openCookieSettings} color="inherit" underline="hover" sx={{ fontSize: "inherit" }}>
        {t("legal.cookie_settings")}
      </Link>
    </Box>
  );
}
