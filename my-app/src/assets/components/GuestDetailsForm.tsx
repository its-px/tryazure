import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, TextField } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { validateGuestDetails, type GuestDetails, type GuestErrors } from "./guestValidation";

interface Props {
  value: GuestDetails;
  onChange: (v: GuestDetails) => void;
  onSubmit: () => void;
  submitting?: boolean;
  onSignIn: () => void;
}

// Guest checkout form (shown in the summary step when the tenant allows it).
export default function GuestDetailsForm({ value, onChange, onSubmit, submitting, onSignIn }: Props) {
  const { t } = useTranslation();
  const colors = useResolvedColors();
  const [errors, setErrors] = useState<GuestErrors>({});
  const set = (patch: Partial<GuestDetails>) => onChange({ ...value, ...patch });

  const submit = () => {
    const e = validateGuestDetails(value);
    setErrors(e);
    if (Object.keys(e).length === 0) onSubmit();
  };

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 420 }}>
      <h4 style={{ margin: 0 }}>{t("guest.title")}</h4>
      <TextField size="small" label={t("guest.name")} value={value.name} autoComplete="name"
        onChange={(e) => set({ name: e.target.value })} error={!!errors.name}
        helperText={errors.name ? t("guest.name_invalid") : undefined} inputProps={{ maxLength: 100 }} />
      <TextField size="small" label={t("guest.phone")} type="tel" value={value.phone} autoComplete="tel"
        onChange={(e) => set({ phone: e.target.value })} error={!!errors.phone}
        helperText={errors.phone ? t("guest.phone_invalid") : undefined} inputProps={{ maxLength: 20 }} />
      <TextField size="small" label={t("guest.email")} type="email" value={value.email} autoComplete="email"
        onChange={(e) => set({ email: e.target.value })} error={!!errors.email}
        helperText={errors.email ? t("guest.email_invalid") : undefined} inputProps={{ maxLength: 254 }} />
      <FormControlLabel
        control={<Checkbox checked={value.consent} onChange={(e) => set({ consent: e.target.checked })} />}
        label={t("guest.consent")}
        sx={errors.consent ? { color: "error.main" } : undefined}
      />
      <Box sx={{ fontSize: 12, color: colors.text.secondary }}>{t("guest.no_card_note")}</Box>
      <Button variant="contained" onClick={submit} disabled={submitting}
        sx={{ alignSelf: "flex-start", px: 3, backgroundColor: colors.accent.main, "&:hover": { backgroundColor: colors.accent.hover } }}>
        {t("booking.confirm_booking")}
      </Button>
      <Button variant="text" onClick={onSignIn} sx={{ alignSelf: "flex-start" }}>
        {t("guest.sign_in_instead")}
      </Button>
    </Box>
  );
}
