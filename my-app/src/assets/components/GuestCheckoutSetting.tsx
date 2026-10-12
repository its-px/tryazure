import { useState } from "react";
import { Box, FormControlLabel, Switch } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
import { supabase } from "./supabaseClient";

// Owner toggle: let visitors book with name/phone/email, no account.
export default function GuestCheckoutSetting() {
  const { t } = useTranslation();
  const colors = useResolvedColors();
  const { tenant, switchTenant } = useTenantContext();
  const [saving, setSaving] = useState(false);

  const toggle = async (enabled: boolean) => {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase.rpc("update_my_tenant", {
      p_name: null,
      p_config: { guestCheckoutEnabled: enabled },
    });
    setSaving(false);
    if (error) return alert(t("settings.save_error", { error: error.message }));
    await switchTenant(tenant.slug);
  };

  return (
    <Box sx={{ background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5 }}>
      <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t("guest.setting_title")}</Box>
      <Box sx={{ fontSize: 13, color: colors.text.secondary, mb: 1 }}>{t("guest.setting_hint")}</Box>
      <FormControlLabel
        control={<Switch checked={tenant?.config?.guestCheckoutEnabled === true} disabled={saving} onChange={(e) => toggle(e.target.checked)} />}
        label={t("guest.setting_label")}
      />
    </Box>
  );
}
