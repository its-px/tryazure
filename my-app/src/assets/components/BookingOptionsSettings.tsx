import { Box, FormControlLabel, Switch } from "@mui/material";
import { useTranslation } from "react-i18next";

interface Props {
  config: Record<string, unknown>;
  saving: boolean;
  // BusinessSettings' save(): update_my_tenant RPC + tenant refetch.
  save: (patch: Record<string, unknown>) => unknown;
}

// Per-tenant booking feature switches; absent key = ON.
export default function BookingOptionsSettings({ config, saving, save }: Props) {
  const { t } = useTranslation();
  const row = (key: string, label: string) => (
    <FormControlLabel
      control={<Switch checked={config[key] !== false} disabled={saving} onChange={(e) => save({ [key]: e.target.checked })} />}
      label={label}
    />
  );
  return (
    <>
      <Box sx={{ fontSize: 16, fontWeight: 700, mt: 1.5, mb: 0.5 }}>{t("settings.booking_options")}</Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {row("anyProfessionalEnabled", t("settings.any_professional_enabled"))}
        {row("waitlistEnabled", t("settings.waitlist_enabled"))}
      </Box>
    </>
  );
}
