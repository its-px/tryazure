import { useCallback, useEffect, useState } from "react";
import { Box, Button, IconButton, TextField } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTranslation } from "react-i18next";
import { supabase } from "./supabaseClient";
import { validateDay, validateTimeOff } from "./scheduleUtils";

// Used by the owner (StaffManager) and the professional (ProfessionalPanel):
// weekly hours with an optional daily break, plus time-off ranges. RLS scopes both.
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const t5 = (v: string | null | undefined) => (v ? v.slice(0, 5) : "");

interface Day { day_of_week: number; start_time: string; end_time: string; break_start: string; break_end: string }
interface TimeOff { id: string; start_at: string; end_at: string; reason: string | null }

export default function StaffScheduleEditor({ tenantId, professionalCode }: { tenantId: string; professionalCode: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<Day[]>([]);
  const [off, setOff] = useState<TimeOff[]>([]);
  const [form, setForm] = useState({ start: "", end: "", reason: "" });

  const load = useCallback(async () => {
    const [h, o] = await Promise.all([
      supabase.from("professional_hours").select("*").eq("tenant_id", tenantId).eq("professional_id", professionalCode).order("day_of_week"),
      supabase.from("professional_time_off").select("id,start_at,end_at,reason").eq("tenant_id", tenantId).eq("professional_id", professionalCode)
        .gte("end_at", new Date().toISOString().slice(0, 19)).order("start_at"),
    ]);
    setDays((h.data ?? []).map((r) => ({
      day_of_week: r.day_of_week, start_time: t5(r.start_time), end_time: t5(r.end_time),
      break_start: t5(r.break_start), break_end: t5(r.break_end),
    })));
    setOff(o.data ?? []);
  }, [tenantId, professionalCode]);

  useEffect(() => { load(); }, [load]);

  const patch = (dow: number, p: Partial<Day>) =>
    setDays((prev) => prev.map((d) => (d.day_of_week === dow ? { ...d, ...p } : d)));

  const save = async () => {
    for (const d of days) {
      const err = validateDay(d);
      if (err) return alert(`${t(`days.${DAYS[d.day_of_week]}`)}: ${t(`schedule.${err}`)}`);
    }
    const del = await supabase.from("professional_hours").delete().eq("tenant_id", tenantId).eq("professional_id", professionalCode);
    if (del.error) return alert(del.error.message);
    if (days.length) {
      const ins = await supabase.from("professional_hours").insert(days.map((d) => ({
        tenant_id: tenantId, professional_id: professionalCode, day_of_week: d.day_of_week,
        start_time: d.start_time, end_time: d.end_time,
        break_start: d.break_start || null, break_end: d.break_end || null,
      })));
      if (ins.error) return alert(ins.error.message);
    }
    alert(t("schedule.saved"));
    load();
  };

  const addOff = async () => {
    const err = validateTimeOff(form.start, form.end);
    if (err) return alert(t(`schedule.${err}`));
    const { error } = await supabase.from("professional_time_off").insert({
      tenant_id: tenantId, professional_id: professionalCode,
      start_at: form.start, end_at: form.end, reason: form.reason.trim() || null,
    });
    if (error) return alert(error.message);
    setForm({ start: "", end: "", reason: "" });
    load();
  };

  const removeOff = async (id: string) => {
    await supabase.from("professional_time_off").delete().eq("id", id);
    load();
  };

  return (
    <Box sx={{ display: "grid", gap: 1.5, mt: 1 }}>
      <Box sx={{ fontWeight: 700, fontSize: 14 }}>{t("schedule.hours_title")}</Box>
      {[0, 1, 2, 3, 4, 5, 6].map((dow) => {
        const d = days.find((x) => x.day_of_week === dow);
        return (
          <Box key={dow} sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Box sx={{ width: 90, fontSize: 13 }}>{t(`days.${DAYS[dow]}`)}</Box>
            {d ? (
              <>
                <TextField size="small" type="time" label={t("schedule.start")} value={d.start_time} InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                  onChange={(e) => patch(dow, { start_time: e.target.value })} />
                <TextField size="small" type="time" label={t("schedule.end")} value={d.end_time} InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                  onChange={(e) => patch(dow, { end_time: e.target.value })} />
                <TextField size="small" type="time" label={t("schedule.break_start")} value={d.break_start} InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                  onChange={(e) => patch(dow, { break_start: e.target.value })} />
                <TextField size="small" type="time" label={t("schedule.break_end")} value={d.break_end} InputLabelProps={{ shrink: true }} sx={{ width: 120 }}
                  onChange={(e) => patch(dow, { break_end: e.target.value })} />
                <Button size="small" color="error" onClick={() => setDays((p) => p.filter((x) => x.day_of_week !== dow))}>{t("schedule.day_off")}</Button>
              </>
            ) : (
              <Button size="small" variant="outlined" onClick={() =>
                setDays((p) => [...p, { day_of_week: dow, start_time: "09:00", end_time: "17:00", break_start: "", break_end: "" }].sort((a, b) => a.day_of_week - b.day_of_week))}>
                {t("schedule.add_day")}
              </Button>
            )}
          </Box>
        );
      })}
      <Box><Button variant="contained" size="small" onClick={save}>{t("schedule.save")}</Button></Box>

      <Box sx={{ fontWeight: 700, fontSize: 14, mt: 2 }}>{t("schedule.time_off_title")}</Box>
      {off.length === 0 && <Box sx={{ fontSize: 13, opacity: 0.7 }}>{t("schedule.time_off_none")}</Box>}
      {off.map((o) => (
        <Box key={o.id} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13 }}>
          <Box sx={{ flex: 1 }}>{o.start_at.slice(0, 16).replace("T", " ")} → {o.end_at.slice(0, 16).replace("T", " ")}{o.reason ? ` (${o.reason})` : ""}</Box>
          <IconButton size="small" aria-label={t("schedule.remove_aria")} onClick={() => removeOff(o.id)}><DeleteOutlineIcon fontSize="small" /></IconButton>
        </Box>
      ))}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <TextField size="small" type="datetime-local" label={t("schedule.from")} value={form.start} InputLabelProps={{ shrink: true }}
          onChange={(e) => setForm({ ...form, start: e.target.value })} />
        <TextField size="small" type="datetime-local" label={t("schedule.to")} value={form.end} InputLabelProps={{ shrink: true }}
          onChange={(e) => setForm({ ...form, end: e.target.value })} />
        <TextField size="small" label={t("schedule.reason")} value={form.reason} inputProps={{ maxLength: 120 }}
          onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Button size="small" variant="contained" onClick={addOff}>{t("common.add")}</Button>
      </Box>
    </Box>
  );
}
