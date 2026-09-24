import { useEffect, useState } from "react";
import { Button, Typography, Paper, Switch, FormControlLabel, Stack, Link } from "@mui/material";
import { useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router-dom";
import { OPEN_EVENT, readConsent, saveConsent } from "./consent";

export default function CookieBanner() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(() => !readConsent());
  const [details, setDetails] = useState(false);
  const [analytics, setAnalytics] = useState(() => readConsent()?.analytics ?? false);
  const [chat, setChat] = useState(() => readConsent()?.chat ?? false);

  useEffect(() => {
    const open = () => {
      const c = readConsent();
      setAnalytics(c?.analytics ?? false);
      setChat(c?.chat ?? false);
      setDetails(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  if (!visible) return null;

  const choose = (a: boolean, c: boolean) => {
    saveConsent(a, c);
    setVisible(false);
  };

  return (
    <Paper
      elevation={4}
      role="dialog"
      aria-label={t("cookies.title")}
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 2000,
        p: 2,
        maxWidth: 600,
        mx: "auto",
      }}
    >
      <Typography variant="subtitle2" gutterBottom>{t("cookies.title")}</Typography>
      <Typography variant="body2">
        {t("cookies.text")}{" "}
        <Link component={RouterLink} to="/cookies">{t("legal.cookies")}</Link>
      </Typography>

      {details && (
        <Stack sx={{ mt: 1 }}>
          <FormControlLabel control={<Switch checked disabled />} label={t("cookies.necessary")} />
          <FormControlLabel
            control={<Switch checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />}
            label={t("cookies.analytics")}
          />
          <FormControlLabel
            control={<Switch checked={chat} onChange={(e) => setChat(e.target.checked)} />}
            label={t("cookies.chat")}
          />
        </Stack>
      )}

      {/* Accept and reject get identical weight: the Greek DPA rejects banners that nudge. */}
      <Stack direction="row" spacing={1} sx={{ mt: 1.5, flexWrap: "wrap", justifyContent: "flex-end", rowGap: 1 }}>
        {details ? (
          <Button variant="outlined" size="small" onClick={() => choose(analytics, chat)}>
            {t("cookies.save")}
          </Button>
        ) : (
          <Button variant="text" size="small" onClick={() => setDetails(true)}>
            {t("cookies.settings")}
          </Button>
        )}
        <Button variant="contained" size="small" onClick={() => choose(false, false)}>
          {t("cookies.reject")}
        </Button>
        <Button variant="contained" size="small" onClick={() => choose(true, true)}>
          {t("cookies.accept")}
        </Button>
      </Stack>
    </Paper>
  );
}
