import { useState, useMemo } from "react";
import { Box } from "@mui/material";
import dayjs, { type Dayjs } from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import type { ProfessionalOption } from "./professionalsService";

dayjs.extend(isoWeek);

interface Booking {
  id: string;
  date: string;
  user_id: string;
  professional_id: string;
  location: string;
  services: string;
  status: string;
  created_at: string;
  start_time?: string;
  end_time?: string;
}

interface OwnerCalendarProps {
  bookings: Booking[];
  professionals: ProfessionalOption[];
  serviceMap: Record<string, string>;
  onBookingClick: (booking: Booking) => void;
  onNewBooking?: (date: string) => void;
}

type CalendarView = "day" | "week" | "month";

// One color per professional slot
const PROF_COLORS = [
  "#2e7d32", "#1565c0", "#6a1b9a", "#e65100",
  "#00695c", "#c62828", "#4527a0", "#00838f",
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function parseTime(t: string | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fmt(n: number) { return String(n).padStart(2, "0"); }

function getServiceNames(services: string, map: Record<string, string>) {
  try {
    const ids = JSON.parse(services);
    return ids.map((id: string) => map[id] || id).join(", ");
  } catch {
    return services;
  }
}

// Mini month calendar
function MiniCalendar({
  focus,
  onFocusChange,
  markedDates,
  colors,
}: {
  focus: Dayjs;
  onFocusChange: (d: Dayjs) => void;
  markedDates: Set<string>;
  colors: ReturnType<typeof useResolvedColors>;
}) {
  const startOfMonth = focus.startOf("month");
  const startOfGrid = startOfMonth.startOf("isoWeek");
  const days: Dayjs[] = [];
  for (let i = 0; i < 42; i++) days.push(startOfGrid.add(i, "day"));

  return (
    <Box>
      {/* Nav */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box
          component="button"
          onClick={() => onFocusChange(focus.subtract(1, "month"))}
          sx={{ background: "none", border: "none", color: colors.text.secondary, cursor: "pointer", p: 0.5, borderRadius: 1, "&:hover": { color: colors.text.primary } }}
        >
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_left</span>
        </Box>
        <Box sx={{ fontSize: 12, fontWeight: 600, color: colors.text.primary }}>
          {focus.format("MMMM YYYY")}
        </Box>
        <Box
          component="button"
          onClick={() => onFocusChange(focus.add(1, "month"))}
          sx={{ background: "none", border: "none", color: colors.text.secondary, cursor: "pointer", p: 0.5, borderRadius: 1, "&:hover": { color: colors.text.primary } }}
        >
          <span className="material-icons" style={{ fontSize: 16 }}>chevron_right</span>
        </Box>
      </Box>
      {/* Day labels */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <Box key={i} sx={{ textAlign: "center", fontSize: 10, color: colors.text.tertiary, py: 0.25 }}>{d}</Box>
        ))}
      </Box>
      {/* Days */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {days.map((d) => {
          const str = d.format("YYYY-MM-DD");
          const isToday = str === dayjs().format("YYYY-MM-DD");
          const isFocus = str === focus.format("YYYY-MM-DD");
          const inMonth = d.month() === focus.month();
          const hasBooking = markedDates.has(str);
          return (
            <Box
              key={str}
              onClick={() => onFocusChange(d)}
              sx={{
                textAlign: "center", py: "3px", borderRadius: "6px", cursor: "pointer",
                fontSize: 11, fontWeight: isFocus ? 700 : 400,
                color: !inMonth ? colors.text.tertiary : isToday || isFocus ? "#fff" : colors.text.primary,
                background: isFocus ? colors.accent.main : isToday ? `${colors.accent.main}55` : "transparent",
                position: "relative",
                "&:hover": { background: isFocus ? colors.accent.main : colors.background.card },
              }}
            >
              {d.date()}
              {hasBooking && !isFocus && (
                <Box sx={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: colors.accent.light }} />
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

// Single booking event card (time grid)
function EventCard({
  booking,
  color,
  serviceMap,
  professionals,
  onClick,
  colors,
}: {
  booking: Booking;
  color: string;
  serviceMap: Record<string, string>;
  professionals: ProfessionalOption[];
  onClick: () => void;
  colors: ReturnType<typeof useResolvedColors>;
}) {
  const startMin = parseTime(booking.start_time);
  const endMin = parseTime(booking.end_time) || startMin + 60;
  const durMin = Math.max(endMin - startMin, 30);
  const topPct = (startMin / (24 * 60)) * 100;
  const heightPct = (durMin / (24 * 60)) * 100;

  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      sx={{
        position: "absolute",
        top: `${topPct}%`,
        height: `${heightPct}%`,
        left: 2, right: 2,
        background: `${color}22`,
        border: `1px solid ${color}66`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "6px",
        p: "3px 5px",
        overflow: "hidden",
        cursor: "pointer",
        zIndex: 1,
        "&:hover": { background: `${color}44`, zIndex: 2 },
      }}
    >
      <Box sx={{ fontSize: 10, fontWeight: 600, color, lineHeight: 1.2 }}>
        {booking.start_time?.substring(0, 5)}
      </Box>
      <Box sx={{ fontSize: 10, color: colors.text.primary, lineHeight: 1.2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
        {getServiceNames(booking.services, serviceMap)}
      </Box>
      {durMin >= 60 && (
        <Box sx={{ fontSize: 9, color: colors.text.secondary, lineHeight: 1.2 }}>
          {professionals.find(p => p.code === booking.professional_id)?.name ?? booking.professional_id}
        </Box>
      )}
    </Box>
  );
}

export default function OwnerCalendar({ bookings, professionals, serviceMap, onBookingClick, onNewBooking }: OwnerCalendarProps) {
  const colors = useResolvedColors();
  const [view, setView] = useState<CalendarView>("week");
  const [focus, setFocus] = useState<Dayjs>(dayjs());
  const [profFilter, setProfFilter] = useState<string>("all");

  // Assign color per professional
  const profColorMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    professionals.forEach((p, i) => { map[p.code] = PROF_COLORS[i % PROF_COLORS.length]; });
    return map;
  }, [professionals]);

  const filteredBookings = useMemo(() =>
    profFilter === "all" ? bookings : bookings.filter(b => b.professional_id === profFilter),
    [bookings, profFilter]
  );

  const bookingDates = useMemo(() => new Set(bookings.map(b => b.date)), [bookings]);

  // Bookings grouped by date
  const byDate = useMemo<Record<string, Booking[]>>(() => {
    const map: Record<string, Booking[]> = {};
    filteredBookings.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [filteredBookings]);

  // Upcoming 5 bookings
  const today = dayjs().format("YYYY-MM-DD");
  const upcoming = useMemo(() =>
    [...filteredBookings]
      .filter(b => b.date >= today && b.status !== "cancelled")
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time ?? "").localeCompare(b.start_time ?? ""))
      .slice(0, 5),
    [filteredBookings, today]
  );

  // Period label
  const periodLabel = view === "week"
    ? `${focus.startOf("isoWeek").format("MMM D")} – ${focus.endOf("isoWeek").format("MMM D, YYYY")}`
    : view === "day"
    ? focus.format("dddd, MMMM D, YYYY")
    : focus.format("MMMM YYYY");

  const navigate = (dir: 1 | -1) => {
    const unit = view === "day" ? "day" : view === "week" ? "week" : "month";
    setFocus(f => f.add(dir, unit));
  };

  // ── WEEK VIEW days ──
  const weekDays = useMemo<Dayjs[]>(() => {
    const start = focus.startOf("isoWeek");
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  }, [focus]);

  // ── MONTH VIEW days ──
  const monthDays = useMemo<Dayjs[]>(() => {
    const start = focus.startOf("month").startOf("isoWeek");
    return Array.from({ length: 42 }, (_, i) => start.add(i, "day"));
  }, [focus]);

  const CELL_H = 56; // px per hour in week/day view
  const GRID_H = CELL_H * 24;

  const statusColor = (s: string) =>
    s === "confirmed" ? colors.status.confirmed
    : s === "pending" ? colors.status.pending
    : s === "cancelled" ? colors.status.cancelled
    : colors.text.secondary;

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden", gap: 0 }}>

      {/* ── Left sidebar ── */}
      <Box sx={{
        width: 220, flexShrink: 0,
        borderRight: `1px solid ${colors.border.main}`,
        display: "flex", flexDirection: "column",
        p: 2, gap: 2, overflowY: "auto",
      }}>
        {/* New Booking button */}
        <Box
          component="button"
          onClick={() => onNewBooking?.(focus.format("YYYY-MM-DD"))}
          sx={{
            background: colors.accent.main,
            color: "#fff", border: "none", borderRadius: "10px",
            py: 1.25, px: 2, fontSize: 13, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75,
            "&:hover": { filter: "brightness(1.1)" },
          }}
        >
          <span className="material-icons" style={{ fontSize: 16 }}>add</span>
          New Booking
        </Box>

        {/* Mini calendar */}
        <MiniCalendar focus={focus} onFocusChange={setFocus} markedDates={bookingDates} colors={colors} />

        {/* Upcoming */}
        <Box>
          <Box sx={{ fontSize: 10, fontWeight: 700, color: colors.text.tertiary, textTransform: "uppercase", letterSpacing: "0.1em", mb: 1 }}>Upcoming</Box>
          {upcoming.length === 0 && (
            <Box sx={{ fontSize: 12, color: colors.text.secondary }}>No upcoming bookings</Box>
          )}
          {upcoming.map(b => (
            <Box
              key={b.id}
              onClick={() => onBookingClick(b)}
              sx={{
                display: "flex", alignItems: "flex-start", gap: 1, mb: 1.25,
                cursor: "pointer", "&:hover .upc-title": { color: colors.accent.light },
              }}
            >
              <Box sx={{ width: 3, height: 3, borderRadius: "50%", background: statusColor(b.status), mt: "5px", flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Box className="upc-title" sx={{ fontSize: 11, fontWeight: 600, color: colors.text.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color 0.15s" }}>
                  {getServiceNames(b.services, serviceMap)}
                </Box>
                <Box sx={{ fontSize: 10, color: colors.text.secondary }}>
                  {dayjs(b.date).format("MMM D")}{b.start_time ? ` · ${b.start_time.substring(0, 5)}` : ""}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Main area ── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Calendar header */}
        <Box sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 2, py: 1.25, borderBottom: `1px solid ${colors.border.main}`,
          flexShrink: 0, gap: 1.5, flexWrap: "wrap",
        }}>
          {/* Left: nav */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              component="button"
              onClick={() => setFocus(dayjs())}
              sx={{ background: colors.background.card, border: `1px solid ${colors.border.main}`, borderRadius: "8px", px: 1.5, py: 0.6, fontSize: 12, fontWeight: 600, color: colors.text.primary, cursor: "pointer", "&:hover": { borderColor: colors.accent.main, color: colors.accent.light } }}
            >Today</Box>
            <Box
              component="button"
              onClick={() => navigate(-1)}
              sx={{ background: "none", border: "none", color: colors.text.secondary, cursor: "pointer", p: 0.5, borderRadius: 1, "&:hover": { color: colors.text.primary } }}
            ><span className="material-icons" style={{ fontSize: 18 }}>chevron_left</span></Box>
            <Box
              component="button"
              onClick={() => navigate(1)}
              sx={{ background: "none", border: "none", color: colors.text.secondary, cursor: "pointer", p: 0.5, borderRadius: 1, "&:hover": { color: colors.text.primary } }}
            ><span className="material-icons" style={{ fontSize: 18 }}>chevron_right</span></Box>
            <Box sx={{ fontSize: 14, fontWeight: 600, color: colors.text.primary, minWidth: 160 }}>{periodLabel}</Box>
          </Box>

          {/* Center: professional filters */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <Box
              component="button"
              onClick={() => setProfFilter("all")}
              sx={{
                px: 1.25, py: 0.4, borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${profFilter === "all" ? colors.accent.main : colors.border.main}`,
                background: profFilter === "all" ? `${colors.accent.main}22` : "none",
                color: profFilter === "all" ? colors.accent.light : colors.text.secondary,
              }}
            >All</Box>
            {professionals.map((p, i) => {
              const c = PROF_COLORS[i % PROF_COLORS.length];
              const active = profFilter === p.code;
              return (
                <Box
                  key={p.id}
                  component="button"
                  onClick={() => setProfFilter(p.code)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 0.5,
                    px: 1.25, py: 0.4, borderRadius: 9999, fontSize: 11, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${active ? c : colors.border.main}`,
                    background: active ? `${c}22` : "none",
                    color: active ? c : colors.text.secondary,
                  }}
                >
                  <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: c, flexShrink: 0 }} />
                  {p.name}
                </Box>
              );
            })}
          </Box>

          {/* Right: view tabs */}
          <Box sx={{ display: "flex", background: colors.background.card, borderRadius: "8px", p: "3px", gap: "3px" }}>
            {(["day", "week", "month"] as const).map(v => (
              <Box
                key={v}
                component="button"
                onClick={() => setView(v)}
                sx={{
                  px: 1.5, py: 0.5, borderRadius: "6px", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer",
                  background: view === v ? colors.background.medium : "none",
                  color: view === v ? colors.text.primary : colors.text.secondary,
                  "&:hover": { color: colors.text.primary },
                }}
              >{v.charAt(0).toUpperCase() + v.slice(1)}</Box>
            ))}
          </Box>
        </Box>

        {/* ── MONTH view ── */}
        {view === "month" && (
          <Box sx={{ flex: 1, overflowY: "auto", p: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                <Box key={d} sx={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: colors.text.tertiary, py: 0.75 }}>{d}</Box>
              ))}
            </Box>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
              {monthDays.map(d => {
                const str = d.format("YYYY-MM-DD");
                const isToday = str === today;
                const inMonth = d.month() === focus.month();
                const dayBookings = byDate[str] ?? [];
                return (
                  <Box
                    key={str}
                    onClick={() => { setFocus(d); setView("day"); }}
                    sx={{
                      minHeight: 80, border: `1px solid ${colors.border.main}`,
                      borderRadius: "8px", p: 0.75, cursor: "pointer",
                      background: isToday ? `${colors.accent.main}11` : colors.background.medium,
                      opacity: inMonth ? 1 : 0.4,
                      "&:hover": { borderColor: colors.accent.main },
                    }}
                  >
                    <Box sx={{ fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? colors.accent.light : colors.text.primary, mb: 0.5 }}>
                      {d.date()}
                    </Box>
                    {dayBookings.slice(0, 3).map(b => (
                      <Box
                        key={b.id}
                        onClick={e => { e.stopPropagation(); onBookingClick(b); }}
                        sx={{
                          fontSize: 9, fontWeight: 600, px: 0.5, py: "1px", borderRadius: "3px", mb: "2px",
                          background: `${profColorMap[b.professional_id] ?? colors.accent.main}33`,
                          color: profColorMap[b.professional_id] ?? colors.accent.light,
                          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
                        }}
                      >
                        {b.start_time?.substring(0, 5) ?? ""} {getServiceNames(b.services, serviceMap)}
                      </Box>
                    ))}
                    {dayBookings.length > 3 && (
                      <Box sx={{ fontSize: 9, color: colors.text.tertiary }}>+{dayBookings.length - 3} more</Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── WEEK view ── */}
        {view === "week" && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Day headers */}
            <Box sx={{ display: "flex", borderBottom: `1px solid ${colors.border.main}`, flexShrink: 0 }}>
              <Box sx={{ width: 48, flexShrink: 0 }} />
              {weekDays.map(d => {
                const str = d.format("YYYY-MM-DD");
                const isToday = str === today;
                return (
                  <Box key={str} onClick={() => { setFocus(d); setView("day"); }} sx={{ flex: 1, textAlign: "center", py: 1, cursor: "pointer", "&:hover": { background: colors.background.card } }}>
                    <Box sx={{ fontSize: 10, color: colors.text.secondary }}>{d.format("ddd")}</Box>
                    <Box sx={{
                      fontSize: 16, fontWeight: 700, mx: "auto", width: 28, height: 28, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isToday ? colors.accent.main : "none",
                      color: isToday ? "#fff" : colors.text.primary,
                    }}>{d.date()}</Box>
                  </Box>
                );
              })}
            </Box>
            {/* Time grid */}
            <Box sx={{ flex: 1, overflowY: "auto", display: "flex" }}>
              {/* Hours col */}
              <Box sx={{ width: 48, flexShrink: 0 }}>
                {HOURS.map(h => (
                  <Box key={h} sx={{ height: CELL_H, borderBottom: `1px solid ${colors.border.main}22`, display: "flex", alignItems: "flex-start", pt: 0.5, pr: 1, justifyContent: "flex-end" }}>
                    <Box sx={{ fontSize: 9, color: colors.text.tertiary }}>{h > 0 ? `${fmt(h)}:00` : ""}</Box>
                  </Box>
                ))}
              </Box>
              {/* Day columns */}
              {weekDays.map(d => {
                const str = d.format("YYYY-MM-DD");
                const dayBookings = byDate[str] ?? [];
                return (
                  <Box key={str} sx={{ flex: 1, position: "relative", borderLeft: `1px solid ${colors.border.main}22` }}>
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <Box key={h} sx={{ height: CELL_H, borderBottom: `1px solid ${colors.border.main}22` }} />
                    ))}
                    {/* Events */}
                    <Box sx={{ position: "absolute", inset: 0, height: GRID_H }}>
                      {dayBookings.map(b => (
                        <EventCard
                          key={b.id}
                          booking={b}
                          color={profColorMap[b.professional_id] ?? colors.accent.main}
                          serviceMap={serviceMap}
                          professionals={professionals}
                          onClick={() => onBookingClick(b)}
                          colors={colors}
                        />
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── DAY view ── */}
        {view === "day" && (
          <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Day header */}
            <Box sx={{ borderBottom: `1px solid ${colors.border.main}`, flexShrink: 0, px: 2, py: 1 }}>
              <Box sx={{ fontSize: 13, fontWeight: 700, color: focus.format("YYYY-MM-DD") === today ? colors.accent.light : colors.text.primary }}>
                {focus.format("dddd, MMMM D")}
              </Box>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", display: "flex" }}>
              <Box sx={{ width: 48, flexShrink: 0 }}>
                {HOURS.map(h => (
                  <Box key={h} sx={{ height: CELL_H, borderBottom: `1px solid ${colors.border.main}22`, display: "flex", alignItems: "flex-start", pt: 0.5, pr: 1, justifyContent: "flex-end" }}>
                    <Box sx={{ fontSize: 9, color: colors.text.tertiary }}>{h > 0 ? `${fmt(h)}:00` : ""}</Box>
                  </Box>
                ))}
              </Box>
              <Box sx={{ flex: 1, position: "relative", borderLeft: `1px solid ${colors.border.main}22` }}>
                {HOURS.map(h => (
                  <Box key={h} sx={{ height: CELL_H, borderBottom: `1px solid ${colors.border.main}22` }} />
                ))}
                <Box sx={{ position: "absolute", inset: 0, height: GRID_H }}>
                  {(byDate[focus.format("YYYY-MM-DD")] ?? []).map(b => (
                    <EventCard
                      key={b.id}
                      booking={b}
                      color={profColorMap[b.professional_id] ?? colors.accent.main}
                      serviceMap={serviceMap}
                      professionals={professionals}
                      onClick={() => onBookingClick(b)}
                      colors={colors}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        )}

      </Box>
    </Box>
  );
}
