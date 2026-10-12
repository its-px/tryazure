import { useState } from "react";
import { Box, Button, CircularProgress, TextField } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
import { supabase } from "./supabaseClient";
import { useTranslation } from "react-i18next";

// Owner cancellation policy. Saved through update_my_tenant like BusinessSettings.
export default function CancellationPolicySettings() {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const { tenant, switchTenant } = useTenantContext();
  const config = tenant?.config ?? {};
  const [hours, setHours] = useState(String(config.cancellationPolicyHours ?? 0));
  const [textEl, setTextEl] = useState((config.cancellationPolicyTextEl as string) ?? "");
  const [textEn, setTextEn] = useState((config.cancellationPolicyTextEn as string) ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!tenant) return;
    const h = Number(hours);
    if (hours.trim() === "" || !Number.isInteger(h) || h < 0 || h > 720) {
      return alert(t("cancel_policy.invalid_hours"));
    }
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.rpc("update_my_tenant", {
      p_name: null,
      p_config: {
        cancellationPolicyHours: h,
        cancellationPolicyTextEl: textEl.trim(),
        cancellationPolicyTextEn: textEn.trim(),
      },
    });
    setSaving(false);
    if (error) return alert(t("settings.save_error", { error: error.message }));
    await switchTenant(tenant.slug);
    setSaved(true);
  };

  return (
    <Box sx={{ background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5 }}>
      <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t("cancel_policy.title")}</Box>
      <Box sx={{ fontSize: 13, color: colors.text.secondary, mb: 1.5 }}>{t("cancel_policy.hint")}</Box>
      {saved && <Box sx={{ fontSize: 13, color: colors.status.confirmed, mb: 1 }}>{t("settings.saved")}</Box>}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField size="small" type="number" label={t("cancel_policy.hours")} value={hours} onChange={(e) => setHours(e.target.value)} inputProps={{ min: 0, max: 720, step: 1 }} />
        <TextField size="small" multiline minRows={2} label={t("cancel_policy.text_el")} helperText={t("cancel_policy.text_hint")} value={textEl} onChange={(e) => setTextEl(e.target.value)} inputProps={{ maxLength: 1000 }} />
        <TextField size="small" multiline minRows={2} label={t("cancel_policy.text_en")} helperText={t("cancel_policy.text_hint")} value={textEn} onChange={(e) => setTextEn(e.target.value)} inputProps={{ maxLength: 1000 }} />
        <Button variant="contained" onClick={save} disabled={saving} sx={{ alignSelf: "flex-start" }}>
          {saving ? <CircularProgress size={16} color="inherit" /> : t("cancel_policy.save")}
        </Button>
      </Box>
    </Box>
  );
}
