import { useEffect, useState } from "react";
import { Box, Button, CircularProgress, FormControlLabel, Switch, TextField } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { useTenantContext } from "../../context/useTenantContext";
import { supabase } from "./supabaseClient";
import PhotoUploadField from "./PhotoUploadField";
import type { TenantBilling } from "./billing";
import { useTranslation } from "react-i18next";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HEX = /^#[0-9a-fA-F]{6}$/;

interface BusinessInfo {
  name?: string;
  address?: string;
  phone?: string;
  hours?: { day: string; hours: string }[];
}

interface BusinessSettingsProps {
  billing: TenantBilling | null;
}

// Owner-editable tenant settings. All writes go through the update_my_tenant RPC
// (owners have no direct UPDATE on tenants; the RPC also validates colors/URLs).
export default function BusinessSettings({ billing }: BusinessSettingsProps) {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const { tenant, switchTenant } = useTenantContext();
  const config = tenant?.config ?? {};
  const info = (config.businessInfo ?? {}) as BusinessInfo;

  const [name, setName] = useState(tenant?.name ?? "");
  const [address, setAddress] = useState(info.address ?? "");
  const [phone, setPhone] = useState(info.phone ?? "");
  const [hours, setHours] = useState<Record<string, string>>(
    Object.fromEntries(DAYS.map((d) => [d, info.hours?.find((h) => h.day === d)?.hours ?? ""])),
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState((config.googleReviewUrl as string) ?? "");
  const [primaryColor, setPrimaryColor] = useState((config.primaryColor as string) ?? "#6c63ff");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Re-seed the form if the tenant reloads (e.g. after a save).
  useEffect(() => {
    setName(tenant?.name ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const save = async (patch: Record<string, unknown>, newName?: string) => {
    if (!tenant) return false;
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.rpc("update_my_tenant", { p_name: newName ?? null, p_config: patch });
    setSaving(false);
    if (error) {
      alert(t("settings.save_error", { error: error.message }));
      return false;
    }
    await switchTenant(tenant.slug); // refetch so the whole app picks up the change
    setSaved(true);
    return true;
  };

  const saveBusiness = () => {
    if (!name.trim()) return alert(t("settings.name_required"));
    if (googleReviewUrl && !googleReviewUrl.startsWith("https://")) {
      return alert(t("settings.review_https"));
    }
    save(
      {
        businessInfo: {
          ...info,
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          hours: DAYS.map((d) => ({ day: d, hours: hours[d].trim() || "Closed" })),
          // Address changed: drop old pin so the map follows the new address.
          ...(address.trim() !== (info.address ?? "") ? { lat: null, lng: null } : {}),
        },
        googleReviewUrl: googleReviewUrl.trim(),
      },
      name.trim(),
    );
  };

  const saveColor = () => {
    if (!HEX.test(primaryColor)) return alert(t("settings.invalid_color"));
    // Derived shades fall back to the primary color (see TenantContext.resolveBrandColors).
    save({
      primaryColor,
      primaryLight: primaryColor,
      primaryDark: primaryColor,
      primaryHover: primaryColor,
      primaryOverlay: `${primaryColor}1a`,
    });
  };

  const connectStripe = async () => {
    setConnecting(true);
    const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action: "connect", returnUrl },
    });
    if (data?.url) return window.location.assign(data.url);
    setConnecting(false);
    if (error || data?.error) alert(t("settings.stripe_error", { error: data?.error ?? error?.message }));
    else window.location.reload(); // already connected: refresh status
  };

  const card = { background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5 };
  const title = { fontSize: 16, fontWeight: 700, mb: 1.5 };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 640 }}>
      {saved && <Box sx={{ fontSize: 13, color: colors.status.confirmed }}>{t("settings.saved")}</Box>}

      <Box sx={card}>
        <Box sx={title}>{t("settings.business_details")}</Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField size="small" label={t("signup.business_name")} value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 80 }} required />
          <TextField size="small" label={t("settings.address")} value={address} onChange={(e) => setAddress(e.target.value)} inputProps={{ maxLength: 200 }} />
          <TextField size="small" label={t("settings.phone")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} inputProps={{ maxLength: 30 }} />
          <TextField size="small" label={t("settings.review_link")} type="url" placeholder="https://g.page/r/..." value={googleReviewUrl} onChange={(e) => setGoogleReviewUrl(e.target.value)} />
          <Box sx={{ fontSize: 13, fontWeight: 600, mt: 1 }}>{t("settings.opening_hours")}</Box>
          {DAYS.map((d) => (
            <TextField
              key={d}
              size="small"
              label={t(`days.${d}`)}
              placeholder={t("settings.hours_placeholder")}
              value={hours[d]}
              onChange={(e) => setHours((h) => ({ ...h, [d]: e.target.value }))}
              inputProps={{ maxLength: 40 }}
            />
          ))}
          <Button variant="contained" onClick={saveBusiness} disabled={saving} sx={{ alignSelf: "flex-start" }}>
            {saving ? <CircularProgress size={16} color="inherit" /> : t("settings.save_details")}
          </Button>
        </Box>
      </Box>

      <Box sx={card}>
        <Box sx={title}>{t("settings.branding")}</Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <PhotoUploadField
            storagePath={`${tenant?.id}/logo.webp`}
            currentUrl={(config.logoUrl as string) ?? null}
            label={t("settings.upload_logo")}
            onUploaded={(url) => save({ logoUrl: url })}
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <input
              type="color"
              value={HEX.test(primaryColor) ? primaryColor : "#6c63ff"}
              onChange={(e) => setPrimaryColor(e.target.value)}
              aria-label={t("settings.brand_color")}
              style={{ width: 48, height: 36, border: "none", background: "none", cursor: "pointer" }}
            />
            <Box sx={{ fontSize: 13, fontFamily: "monospace" }}>{primaryColor}</Box>
            <Button variant="outlined" size="small" onClick={saveColor} disabled={saving}>
              {t("settings.save_color")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box sx={card}>
        <Box sx={title}>{t("settings.booking_wizard")}</Box>
        <FormControlLabel
          control={
            <Switch
              checked={config.locationStepEnabled !== false}
              disabled={saving}
              onChange={(e) => save({ locationStepEnabled: e.target.checked })}
            />
          }
          label={t("settings.show_location_step")}
        />
      </Box>

      <Box sx={card}>
        <Box sx={title}>{t("settings.payments_title")}</Box>
        <Box sx={{ fontSize: 13, color: colors.text.secondary, mb: 1.5 }}>
          {t("settings.payments_text")}
        </Box>
        {billing?.connect_charges_enabled ? (
          <Box sx={{ fontSize: 14, color: colors.status.confirmed, fontWeight: 600 }}>
            {t("settings.payments_on")}
          </Box>
        ) : (
          <Button variant="contained" onClick={connectStripe} disabled={connecting}>
            {connecting ? <CircularProgress size={16} color="inherit" /> : billing?.stripe_connect_account_id ? t("settings.finish_stripe") : t("settings.connect_stripe")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
