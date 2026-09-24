import { useState } from "react";
import { Box, Button, CircularProgress, IconButton, TextField } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import dayjs from "dayjs";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { supabase } from "./supabaseClient";
import PhotoUploadField from "./PhotoUploadField";
import type { ProfessionalOption } from "./professionalsService";
import { useTranslation } from "react-i18next";

// Mon–Fri 09:00–17:00 (0 = Sunday), same shape the Admin/Professional panels edit.
const DEFAULT_HOURS = [1, 2, 3, 4, 5].map((day_of_week) => ({
  day_of_week,
  start_time: "09:00",
  end_time: "17:00",
}));

interface StaffManagerProps {
  tenantId: string;
  professionals: ProfessionalOption[];
  onChanged: () => Promise<void> | void;
}

// Staff = bookable professionals. "Invite to log in" gives one a login via the
// invite-staff edge function (role=professional, linked to their professionals row).
export default function StaffManager({ tenantId, professionals, onChanged }: StaffManagerProps) {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const add = async () => {
    const name = newName.trim();
    if (!name || !tenantId) return;
    setBusy("add");
    const code = `p${Date.now().toString(36)}`;
    const { error } = await supabase.from("professionals").insert({ tenant_id: tenantId, name, code });
    if (error) {
      setBusy(null);
      return alert(error.code === "23505" ? t("staff.name_exists") : t("staff.add_error", { error: error.message }));
    }
    await supabase
      .from("professional_hours")
      .insert(DEFAULT_HOURS.map((h) => ({ ...h, tenant_id: tenantId, professional_id: code })));
    setNewName("");
    await onChanged();
    setBusy(null);
  };

  // ponytail: window.prompt matches the alert/confirm UX here; swap for a dialog if owners find it rough.
  const invite = async (p: ProfessionalOption) => {
    const email = window.prompt(t("staff.invite_prompt", { name: p.name }))?.trim();
    if (!email) return;
    setBusy(`invite-${p.id}`);
    const { data, error } = await supabase.functions.invoke("invite-staff", {
      body: { professionalId: p.id, email, redirectTo: `${window.location.origin}/professional` },
    });
    setBusy(null);
    if (error) {
      // FunctionsHttpError carries the JSON body with our message.
      const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
      return alert(body?.error ?? t("staff.invite_error"));
    }
    if (data?.ok) alert(t("staff.invite_sent", { email, name: p.name }));
  };

  const remove = async (p: ProfessionalOption) => {
    const { count } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("professional_id", p.code)
      .gte("date", dayjs().format("YYYY-MM-DD"))
      .not("status", "in", "(cancelled,expired)");
    if (count) {
      return alert(t("staff.has_bookings", { name: p.name, count }));
    }
    if (!window.confirm(t("staff.remove_confirm", { name: p.name }))) return;
    setBusy(p.id);
    await supabase.from("professional_hours").delete().eq("tenant_id", tenantId).eq("professional_id", p.code);
    const { error } = await supabase.from("professionals").delete().eq("id", p.id);
    if (error) alert(t("staff.remove_error", { error: error.message }));
    await onChanged();
    setBusy(null);
  };

  return (
    <Box sx={{ background: colors.background.medium, borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.10)", p: 2.5, maxWidth: 640 }}>
      <Box sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>{t("staff.title")}</Box>
      <Box sx={{ fontSize: 12, color: colors.text.secondary, mb: 2 }}>
        {t("staff.default_hours_note")}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 2 }}>
        {professionals.length === 0 && <Box sx={{ color: colors.text.tertiary, fontSize: 13 }}>{t("staff.none")}</Box>}
        {professionals.map((p) => (
          <Box key={p.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ minWidth: 140, fontSize: 14, flex: 1 }}>{p.name}</Box>
            <PhotoUploadField
              storagePath={`${tenantId}/professionals/${p.id}.webp`}
              currentUrl={p.photo_url}
              onUploaded={async (url) => {
                await supabase.from("professionals").update({ photo_url: url }).eq("id", p.id);
                await onChanged();
              }}
            />
            <Button size="small" onClick={() => invite(p)} disabled={!!busy}>
              {busy === `invite-${p.id}` ? <CircularProgress size={16} /> : t("staff.invite")}
            </Button>
            <IconButton aria-label={t("staff.remove_aria", { name: p.name })} onClick={() => remove(p)} disabled={!!busy} sx={{ color: colors.error.main }}>
              {busy === p.id ? <CircularProgress size={18} /> : <DeleteOutlineIcon />}
            </IconButton>
          </Box>
        ))}
      </Box>

      <Box
        component="form"
        onSubmit={(e) => { e.preventDefault(); add(); }}
        sx={{ display: "flex", gap: 1 }}
      >
        <TextField size="small" label={t("staff.name")} value={newName} onChange={(e) => setNewName(e.target.value)} inputProps={{ maxLength: 60 }} sx={{ flex: 1 }} />
        <Button type="submit" variant="contained" disabled={!newName.trim() || !!busy}>
          {busy === "add" ? <CircularProgress size={16} color="inherit" /> : t("common.add")}
        </Button>
      </Box>
    </Box>
  );
}
