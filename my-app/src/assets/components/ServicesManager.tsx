import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { supabase } from "./supabaseClient";
import { useTranslation } from "react-i18next";

interface ServiceRow {
  id: string;
  name: string;
  name_en: string | null;
  duration_minutes: number | null;
  price: number | null;
}

const emptyForm = { name: "", name_en: "", duration_minutes: "30", price: "" };

// Owner CRUD for bookable services (RLS: services_manage_owner). Same Dialog
// pattern as ProductCatalog. Self-serve tenants start with none.
export default function ServicesManager({ tenantId }: { tenantId: string }) {
  const colors = useResolvedColors();
  const { t } = useTranslation();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    const { data } = await supabase
      .from("services")
      .select("id, name, name_en, duration_minutes, price")
      .eq("tenant_id", tenantId)
      .order("name");
    setServices((data as ServiceRow[]) ?? []);
  };

  useEffect(() => {
    if (tenantId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const open = (s?: ServiceRow) => {
    setEditingId(s?.id ?? null);
    setForm(
      s
        ? { name: s.name, name_en: s.name_en ?? "", duration_minutes: String(s.duration_minutes ?? ""), price: String(s.price ?? "") }
        : emptyForm,
    );
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      tenant_id: tenantId,
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      duration_minutes: Number(form.duration_minutes) || 30,
      price: Number(form.price) || 0,
    };
    const { error } = editingId
      ? await supabase.from("services").update(payload).eq("id", editingId)
      : await supabase.from("services").insert(payload);
    if (error) {
      alert(t("services_mgr.save_error", { error: error.message }));
      return;
    }
    setDialogOpen(false);
    await load();
  };

  const remove = async (s: ServiceRow) => {
    if (!window.confirm(t("common.delete_confirm", { name: s.name }))) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    // Services referenced by past bookings can't be deleted (FK).
    if (error) alert(t("services_mgr.delete_error"));
    await load();
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.75 }}>
        <Box sx={{ fontSize: 16, fontWeight: 700 }}>{t("services_mgr.title")}</Box>
        <Button variant="contained" size="small" onClick={() => open()} sx={{ backgroundColor: colors.accent.main }}>
          {t("services_mgr.add")}
        </Button>
      </Box>

      <Box sx={{ background: colors.background.medium, borderRadius: "10px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.10)" }}>
        {services.length === 0 && (
          <Box sx={{ p: 3, textAlign: "center", color: colors.text.tertiary, fontSize: 13 }}>
            {t("services_mgr.none")}
          </Box>
        )}
        {services.map((s) => (
          <Box
            key={s.id}
            sx={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr 140px",
              px: 2, py: 1.5,
              alignItems: "center",
              fontSize: 13,
              borderTop: `1px solid ${colors.border.main}`,
            }}
          >
            <span>{s.name}</span>
            <span>{s.duration_minutes != null ? t("common.minutes_short", { count: s.duration_minutes }) : "—"}</span>
            <span>€{s.price ?? 0}</span>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" onClick={() => open(s)}>{t("common.edit")}</Button>
              <Button size="small" color="error" onClick={() => remove(s)}>{t("common.delete")}</Button>
            </Box>
          </Box>
        ))}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? t("services_mgr.edit") : t("services_mgr.add")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label={t("staff.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} fullWidth sx={{ mt: 1 }} />
          <TextField label={t("services_mgr.name_en")} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} fullWidth />
          <TextField
            label={t("services_mgr.duration")}
            type="number"
            inputProps={{ min: 5, step: 5 }}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            fullWidth
          />
          <TextField label={t("services_mgr.price")} type="number" inputProps={{ min: 0 }} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t("common.cancel")}</Button>
          <Button variant="contained" onClick={save} disabled={!form.name.trim()}>
            {t("common.save")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
