import { useState } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { supabase } from "./supabaseClient";
import { daysLeft, isTenantActive, type TenantBilling } from "./billing";
import { useTranslation } from "react-i18next";

// ponytail: display-only copy of the Stripe prices (STRIPE_PRICE_BASIC / _PRO).
// Keep in sync with the Stripe dashboard; fetch from Stripe if plans start changing often.
const PLANS = [
  { key: "basic", name: "Basic", price: "€29", perks: "billing.perks_basic" },
  { key: "pro", name: "Pro", price: "€59", perks: "billing.perks_pro" },
] as const;

// Stripe subscription status -> translation key.
const STATUS_LABEL: Record<string, string> = {
  trialing: "billing.status_trialing",
  active: "billing.status_active",
  past_due: "billing.status_failed",
  unpaid: "billing.status_failed",
  canceled: "billing.status_canceled",
  incomplete: "billing.status_incomplete",
  incomplete_expired: "billing.status_expired",
  paused: "billing.status_paused",
};

interface BillingPanelProps {
  billing: TenantBilling | null;
}

export default function BillingPanel({ billing }: BillingPanelProps) {
  const colors = useResolvedColors();
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);

  const active = isTenantActive(billing);
  const hasSubscription = !!billing?.plan && billing.status !== "canceled";
  const card = { background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5 };

  const go = async (action: "checkout" | "portal", plan?: string) => {
    setBusy(plan ?? action);
    const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
    const { data, error } = await supabase.functions.invoke("billing", {
      body: { action, plan, returnUrl },
    });
    if (error || !data?.url) {
      setBusy(null);
      alert(t("billing.open_error", { error: data?.error ?? error?.message ?? "unknown error" }));
      return;
    }
    window.location.assign(data.url);
  };

  let summary = "";
  if (!billing) summary = t("billing.not_set_up");
  else if (billing.status === "trialing") summary = t("billing.trial_left", { count: daysLeft(billing.trial_ends_at) });
  else if (billing.status === "active" && billing.current_period_end)
    summary = t("billing.renews_on", { date: new Date(billing.current_period_end).toLocaleDateString(i18n.language === "gr" ? "el-GR" : "en-GB") });
  else if (billing.status === "past_due" || billing.status === "unpaid")
    summary = t("billing.payment_failed");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 720 }}>
      {!active && (
        <Box sx={{ ...card, border: `1px solid ${colors.error.main}` }}>
          <Box sx={{ fontSize: 16, fontWeight: 700, color: colors.error.main, mb: 0.5 }}>
            {t("billing.attention_title")}
          </Box>
          <Box sx={{ fontSize: 13, color: colors.text.secondary }}>
            {t("billing.attention_text")}
          </Box>
        </Box>
      )}

      <Box sx={card}>
        <Box sx={{ fontSize: 16, fontWeight: 700, mb: 1 }}>{t("billing.subscription")}</Box>
        <Box sx={{ fontSize: 14, mb: 0.5 }}>
          {billing?.plan ? PLANS.find((p) => p.key === billing.plan)?.name ?? billing.plan : t("billing.no_plan")} ·{" "}
          {STATUS_LABEL[billing?.status ?? ""] ? t(STATUS_LABEL[billing?.status ?? ""]) : billing?.status ?? "—"}
        </Box>
        {summary && <Box sx={{ fontSize: 13, color: colors.text.secondary }}>{summary}</Box>}
        {billing?.stripe_customer_id && (
          <Button
            variant="outlined"
            sx={{ mt: 2 }}
            disabled={!!busy}
            onClick={() => go("portal")}
            startIcon={busy === "portal" ? <CircularProgress size={14} /> : undefined}
          >
            {t("billing.manage")}
          </Button>
        )}
      </Box>

      {!hasSubscription && (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          {PLANS.map((p) => (
            <Box key={p.key} sx={{ ...card, display: "flex", flexDirection: "column", gap: 1 }}>
              <Box sx={{ fontSize: 15, fontWeight: 700 }}>{p.name}</Box>
              <Box sx={{ fontSize: 22, fontWeight: 700, color: colors.accent.main }}>{t("billing.per_month", { price: p.price })}</Box>
              <Box sx={{ fontSize: 13, color: colors.text.secondary, flex: 1 }}>{t(p.perks)}</Box>
              <Button
                variant="contained"
                disabled={!!busy}
                onClick={() => go("checkout", p.key)}
                startIcon={busy === p.key ? <CircularProgress size={14} color="inherit" /> : undefined}
              >
                {t("billing.subscribe")}
              </Button>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
