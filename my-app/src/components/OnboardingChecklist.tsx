import { useEffect, useRef, useState } from "react";
import { Box, Button, Checkbox, IconButton, TextField } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "../assets/components/supabaseClient";
import { useResolvedColors } from "../hooks/useResolvedColors";
import { useTenantContext } from "../context/useTenantContext";
import type { TenantBilling } from "../assets/components/billing";
import { useTranslation } from "react-i18next";

export type OnboardingTarget = "services" | "staff" | "settings";

interface OnboardingChecklistProps {
  billing: TenantBilling | null;
  onNavigate: (view: OnboardingTarget) => void;
}

// localStorage can throw (private mode / blocked storage) — treat that as "not set".
const readFlag = (key: string) => {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
};
const writeFlag = (key: string) => {
  try { localStorage.setItem(key, "1"); } catch { /* ignore */ }
};

// Owner dashboard "Get started" card + the always-visible booking link / QR.
export default function OnboardingChecklist({ billing, onNavigate }: OnboardingChecklistProps) {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const { tenant } = useTenantContext();
  const tenantId = tenant?.id ?? "";
  const sharedKey = `onboarding-shared-${tenantId}`;
  const dismissedKey = `onboarding-dismissed-${tenantId}`;

  const [counts, setCounts] = useState<{ services: number; hours: number } | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [shared, setShared] = useState(() => readFlag(sharedKey));
  const [dismissed, setDismissed] = useState(() => readFlag(dismissedKey));
  const [copied, setCopied] = useState(false);
  const qrWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    (async () => {
      const [svc, hrs, ten] = await Promise.all([
        supabase.from("services").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("professional_hours").select("*", { count: "exact", head: true }).eq("tenant_id", tenantId),
        supabase.from("tenants").select("domain").eq("id", tenantId).maybeSingle(),
      ]);
      if (cancelled) return;
      setCounts({ services: svc.count ?? 0, hours: hrs.count ?? 0 });
      setDomain(ten.data?.domain ?? null);
    })();
    return () => { cancelled = true; };
  }, [tenantId]);

  if (!tenant) return null;

  // Tenants without a domain (demo-*) are reached through ?tenant=.
  const bookingUrl = domain
    ? `https://${domain}/`
    : `${window.location.origin}/?tenant=${encodeURIComponent(tenant.slug)}`;

  const items: { label: string; done: boolean; target?: OnboardingTarget; action: string }[] = [
    { label: t("onboarding.services"), done: (counts?.services ?? 0) > 0, target: "services", action: t("onboarding.services_action") },
    { label: t("onboarding.staff"), done: (counts?.hours ?? 0) > 0, target: "staff", action: t("onboarding.staff_action") },
    { label: t("onboarding.branding"), done: !!(tenant.config.logoUrl || tenant.config.primaryColor), target: "settings", action: t("onboarding.branding_action") },
    { label: t("onboarding.stripe"), done: !!billing?.connect_charges_enabled, target: "settings", action: t("onboarding.stripe_action") },
    { label: t("onboarding.share"), done: shared, action: "" },
  ];
  const allDone = counts !== null && items.every((i) => i.done);
  const showChecklist = counts !== null && !dismissed && !allDone;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t("onboarding.copy_prompt"), bookingUrl);
    }
  };

  const downloadQr = () => {
    const canvas = qrWrap.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${tenant.slug}-booking-qr.png`;
    a.click();
  };

  const card = { background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5, mb: 3 };

  return (
    <>
      {showChecklist && (
        <Box sx={{ ...card, position: "relative", border: `1px solid ${colors.accent.main}` }}>
          <IconButton
            size="small"
            aria-label={t("onboarding.dismiss")}
            onClick={() => { writeFlag(dismissedKey); setDismissed(true); }}
            sx={{ position: "absolute", top: 8, right: 8, color: colors.text.secondary }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
          <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t("onboarding.title")}</Box>
          <Box sx={{ fontSize: 13, color: colors.text.secondary, mb: 1.5 }}>
            {t("onboarding.progress", { done: items.filter((i) => i.done).length, total: items.length })}
          </Box>
          {items.map((item) => (
            <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, fontSize: 14 }}>
              <Checkbox
                size="small"
                checked={item.done}
                // Only the "shared" step is a manual tick; the rest come from real data.
                disabled={!!item.target}
                onChange={() => { writeFlag(sharedKey); setShared(true); }}
                inputProps={{ "aria-label": item.label }}
              />
              <Box sx={{ flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? colors.text.tertiary : colors.text.primary }}>
                {item.label}
              </Box>
              {item.target && !item.done && (
                <Button size="small" onClick={() => onNavigate(item.target!)}>{item.action}</Button>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box sx={{ ...card, display: "flex", gap: 2.5, alignItems: "center", flexWrap: "wrap" }}>
        <Box ref={qrWrap} sx={{ p: 1, bgcolor: "#fff", borderRadius: "8px", lineHeight: 0 }}>
          {/* Drawn at 512px for a print-quality download, shown at 112px. */}
          <QRCodeCanvas value={bookingUrl} size={512} marginSize={2} style={{ width: 112, height: 112 }} aria-label={t("onboarding.qr_aria")} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 220 }}>
          <Box sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>{t("onboarding.link_title")}</Box>
          <TextField size="small" fullWidth value={bookingUrl} InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} />
          <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Button size="small" variant="contained" onClick={copy} sx={{ backgroundColor: colors.accent.main }}>
              {copied ? t("onboarding.copied") : t("onboarding.copy")}
            </Button>
            <Button size="small" variant="outlined" onClick={downloadQr}>{t("onboarding.download_qr")}</Button>
          </Box>
        </Box>
      </Box>
    </>
  );
}
