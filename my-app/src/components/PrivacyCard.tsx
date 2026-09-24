import { useEffect, useState } from "react";
import { Button, Card, CardContent, FormControlLabel, Stack, Switch, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { supabase } from "../assets/components/supabaseClient";

// GDPR art. 15/20 (download), 17 (delete), 21 (object to marketing).
export default function PrivacyCard({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [marketing, setMarketing] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("marketing_opt_out").eq("id", userId).maybeSingle()
      .then(({ data }) => setMarketing(data ? !data.marketing_opt_out : null));
  }, [userId]);

  const toggleMarketing = async (on: boolean) => {
    setMarketing(on);
    const { error } = await supabase.from("profiles").update({ marketing_opt_out: !on }).eq("id", userId);
    if (error) setMarketing(!on);
  };

  const download = async () => {
    setBusy(true);
    const [{ data: auth }, profile, bookings, waitlist] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("bookings").select("*").eq("user_id", userId),
      supabase.from("waitlist_entries").select("*").eq("user_id", userId),
    ]);
    const u = auth.user;
    const data = {
      exported_at: new Date().toISOString(),
      account: u && { id: u.id, email: u.email, phone: u.phone, created_at: u.created_at, providers: u.app_metadata?.providers },
      profile: profile.data,
      bookings: bookings.data,
      waitlist: waitlist.data,
    };
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setBusy(false);
  };

  const deleteAccount = async () => {
    if (!window.confirm(t("account.delete_confirm"))) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { body: {} });
    if (error || !data?.success) {
      setBusy(false);
      alert(t("account.delete_failed") + (data?.error || error?.message || ""));
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    window.location.href = "/";
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 1 }}>{t("account.privacy")}</Typography>
        {marketing !== null && (
          <FormControlLabel
            control={<Switch checked={marketing} onChange={(e) => toggleMarketing(e.target.checked)} />}
            label={<Typography variant="body2">{t("account.marketing")}</Typography>}
          />
        )}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={download} disabled={busy}>{t("account.download")}</Button>
          <Button variant="outlined" color="error" onClick={deleteAccount} disabled={busy}>{t("account.delete")}</Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
