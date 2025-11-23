import React from "react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors } from "../../theme";

const localizer = momentLocalizer(moment);

type BigCalendarProps = {
  selectedDates: string[];
  setSelectedDates: (dates: string[]) => void;
  allowedDates?: string[]; // optional: restrict dates
  enableMultipleViews?: boolean; // Enable multiple view options (Month, Week, Day, Agenda)
  defaultView?: View; // Default view
};

export const BigCalendar = ({
  selectedDates,
  setSelectedDates,
  allowedDates,
  enableMultipleViews = false,
  defaultView = "month",
}: BigCalendarProps) => {
  // Get theme mode from Redux
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);

  // Separate state for calendar view (navigation) and selected date
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    return selectedDates[0] ? new Date(selectedDates[0]) : new Date();
  });

  // State for current view (Month, Week, Day, Agenda)
  const [currentView, setCurrentView] = React.useState<View>(defaultView);

  // Ensure today is selected on first mount if no date is selected
  React.useEffect(() => {
    if (!selectedDates[0]) {
      const todayStr = moment().format("YYYY-MM-DD");
      setSelectedDates([todayStr]);
    }
  }, [selectedDates, setSelectedDates]);

  // Check if a date is allowed
  const isDateAllowed = (date: Date) => {
    if (!allowedDates) return true;
    const dateStr = moment(date).format("YYYY-MM-DD");
    return allowedDates.includes(dateStr);
  };

  // Handle date selection (clicking on a date)
  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    const selectedMoment = moment(slotInfo.start);
    // Don't allow past dates
    if (selectedMoment.isBefore(moment(), "day")) return;

    // Check if date is allowed
    if (!isDateAllowed(slotInfo.start)) return;

    const dateStr = selectedMoment.format("YYYY-MM-DD");
    setSelectedDates([dateStr]);
    setViewDate(slotInfo.start); // Update view to show selected date
  };

  // Handle navigation (Today, Back, Next buttons)
  const handleNavigate = (date: Date) => {
    // Just update the view, don't select the date
    setViewDate(date);
  };

  // Style dates that are not allowed
  const dayPropGetter = (date: Date) => {
    const isPast = moment(date).isBefore(moment(), "day");
    const isDisabled = !isDateAllowed(date) || isPast;
    const isSelected = moment(date).format("YYYY-MM-DD") === selectedDates[0];
    const isToday = moment(date).isSame(moment(), "day");

    return {
      className: isSelected
        ? "selected-date"
        : isToday
        ? "today-date"
        : isDisabled
        ? "disabled-date"
        : "",
      style: {
        backgroundColor: isSelected
          ? colors.accent.main
          : isDisabled
          ? mode === "dark"
            ? "#1a1a1a"
            : "#e0e0e0"
          : "transparent",
        color: isSelected
          ? colors.text.primary
          : isDisabled
          ? mode === "dark"
            ? "#555555"
            : "#999999"
          : colors.text.primary,
        cursor: isDisabled ? "not-allowed" : "pointer",
        pointerEvents: (isDisabled
          ? "none"
          : "auto") as React.CSSProperties["pointerEvents"],
        border:
          isToday && !isSelected ? `2px solid ${colors.accent.main}` : "none",
        fontWeight: isSelected || isToday ? "bold" : "normal",
        opacity: isDisabled ? 0.4 : 1,
        textDecoration: isDisabled ? "line-through" : "none",
      },
    };
  };

  // Custom styles for the calendar
  const calendarStyles: React.CSSProperties = {
    height: "100%",
    fontFamily: "inherit",
    backgroundColor: colors.background.medium,
    color: colors.text.primary,
    borderRadius: "10px",
    padding: "20px",
    boxShadow:
      mode === "dark"
        ? "0 4px 12px rgba(0,0,0,0.3)"
        : "0 4px 12px rgba(0,0,0,0.1)",
  };

  return (
    <div style={{ height: "600px", width: "100%" }}>
      <style>
        {`
          .rbc-calendar {
            font-family: inherit;
          }
          
          /* Toolbar styling */
          .rbc-toolbar {
            padding: 15px 0;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
          }
          
          .rbc-toolbar button {
            color: ${colors.text.primary};
            background-color: ${colors.background.card};
            border: 1px solid ${colors.border.main};
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          
          .rbc-toolbar button:hover {
            background-color: ${colors.accent.light};
            color: ${colors.text.primary};
            border-color: ${colors.accent.main};
          }
          
          .rbc-toolbar button:active,
          .rbc-toolbar button.rbc-active {
            background-color: ${colors.accent.main};
            color: ${colors.text.primary};
            border-color: ${colors.accent.dark};
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
          }
          
          .rbc-toolbar-label {
            font-size: 20px;
            font-weight: 600;
            color: ${colors.text.primary};
            text-transform: capitalize;
            flex-grow: 1;
            text-align: center;
          }
          
          /* Month view styling */
          .rbc-month-view {
            border: 1px solid ${colors.border.main};
            border-radius: 8px;
            overflow: hidden;
            background-color: ${colors.background.medium};
          }
          
          .rbc-header {
            padding: 12px 5px;
            font-weight: 600;
            font-size: 14px;
            color: ${colors.text.secondary};
            background-color: ${colors.background.card};
            border-bottom: 2px solid ${colors.accent.main};
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .rbc-header + .rbc-header {
            border-left: 1px solid ${colors.border.main};
          }
          
          /* Day cells */
          .rbc-day-bg {
            background-color: ${colors.background.medium};
            border-left: 1px solid ${colors.border.main};
            transition: background-color 0.2s ease;
          }
          
          .rbc-day-bg:hover {
            background-color: ${colors.background.overlay};
          }
          
          .rbc-off-range-bg {
            background-color: ${mode === "dark" ? "#1a1a1a" : "#fafafa"};
          }
          
          .rbc-today {
            background-color: ${colors.background.overlay} !important;
          }
          
          /* Disabled dates styling */
          .disabled-date {
            position: relative;
            opacity: 0.4;
          }
          
          .disabled-date::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 10%;
            right: 10%;
            height: 1px;
            background-color: ${mode === "dark" ? "#666666" : "#999999"};
            transform: translateY(-50%);
          }
          
          .disabled-date:hover {
            background-color: ${
              mode === "dark" ? "#1a1a1a" : "#e0e0e0"
            } !important;
          }
          
          .rbc-date-cell {
            padding: 8px;
            text-align: right;
          }
          
          .rbc-button-link {
            color: ${colors.text.primary};
            font-weight: 500;
            font-size: 14px;
          }
          
          .rbc-off-range .rbc-button-link {
            color: ${colors.text.tertiary};
          }
          
          .rbc-now .rbc-button-link {
            color: ${colors.accent.main};
            font-weight: 700;
          }
          
          /* Selected date styling */
          .selected-date {
            background-color: ${colors.accent.main} !important;
            border-radius: 8px;
          }
          
          .selected-date .rbc-button-link {
            color: ${colors.text.primary} !important;
            font-weight: 700;
          }
          
          .today-date {
            position: relative;
          }
          
          .today-date .rbc-button-link {
            color: ${colors.accent.main};
            font-weight: 700;
          }
          
          /* Row styling */
          .rbc-month-row {
            border-top: 1px solid ${colors.border.main};
            min-height: 80px;
          }
          
          .rbc-month-row:first-child {
            border-top: none;
          }
          
          /* Remove default focus outline, add custom */
          .rbc-toolbar button:focus,
          .rbc-day-bg:focus {
            outline: 2px solid ${colors.accent.main};
            outline-offset: 2px;
          }
          
          /* Responsive adjustments */
          @media (max-width: 768px) {
            .rbc-toolbar {
              font-size: 12px;
            }
            
            .rbc-toolbar button {
              padding: 6px 12px;
              font-size: 12px;
            }
            
            .rbc-toolbar-label {
              font-size: 16px;
            }
            
            .rbc-header {
              padding: 8px 2px;
              font-size: 12px;
            }
            
            .rbc-date-cell {
              padding: 4px;
            }
            
            .rbc-button-link {
              font-size: 12px;
            }
          }
          
          /* Scrollbar styling for consistency */
          .rbc-month-view::-webkit-scrollbar {
            width: 8px;
          }
          
          .rbc-month-view::-webkit-scrollbar-track {
            background: ${colors.background.card};
          }
          
          .rbc-month-view::-webkit-scrollbar-thumb {
            background: ${colors.accent.main};
            border-radius: 4px;
          }
          
          .rbc-month-view::-webkit-scrollbar-thumb:hover {
            background: ${colors.accent.dark};
          }
          
          /* Week View Styling */
          .rbc-time-view {
            border: 1px solid ${colors.border.main};
            border-radius: 8px;
            background-color: ${colors.background.medium};
          }
          
          .rbc-time-header {
            background-color: ${colors.background.card};
            border-bottom: 2px solid ${colors.accent.main};
          }
          
          .rbc-time-header-content {
            border-left: 1px solid ${colors.border.main};
          }
          
          .rbc-time-content {
            border-top: 1px solid ${colors.border.main};
          }
          
          .rbc-time-slot {
            border-top: 1px solid ${colors.border.main};
            color: ${colors.text.secondary};
          }
          
          .rbc-current-time-indicator {
            background-color: ${colors.accent.main};
            height: 2px;
          }
          
          .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid ${colors.border.main};
          }
          
          .rbc-timeslot-group {
            border-left: 1px solid ${colors.border.main};
            min-height: 40px;
          }
          
          .rbc-time-header-gutter {
            background-color: ${colors.background.card};
          }
          
          .rbc-label {
            color: ${colors.text.secondary};
            font-size: 12px;
            padding: 0 5px;
          }
          
          .rbc-allday-cell {
            background-color: ${colors.background.card};
            border-bottom: 1px solid ${colors.border.main};
          }
          
          .rbc-time-header-cell {
            border-left: 1px solid ${colors.border.main};
          }
          
          /* Day View Styling */
          .rbc-day-slot {
            background-color: ${colors.background.medium};
          }
          
          /* Agenda View Styling */
          .rbc-agenda-view {
            border: 1px solid ${colors.border.main};
            border-radius: 8px;
            background-color: ${colors.background.medium};
            padding: 10px;
          }
          
          .rbc-agenda-table {
            border: 1px solid ${colors.border.main};
            border-radius: 8px;
            overflow: hidden;
          }
          
          .rbc-agenda-date-cell,
          .rbc-agenda-time-cell,
          .rbc-agenda-event-cell {
            padding: 10px;
            color: ${colors.text.primary};
            border-bottom: 1px solid ${colors.border.main};
          }
          
          .rbc-agenda-date-cell {
            background-color: ${colors.background.card};
            font-weight: 600;
          }
          
          .rbc-agenda-time-cell {
            color: ${colors.text.secondary};
            font-size: 14px;
          }
          
          .rbc-agenda-event-cell {
            background-color: ${colors.background.medium};
          }
          
          /* Event styling for all views */
          .rbc-event {
            background-color: ${colors.accent.main};
            border-radius: 4px;
            padding: 2px 5px;
            color: ${colors.text.primary};
            border: none;
          }
          
          .rbc-event:hover {
            background-color: ${colors.accent.dark};
          }
          
          .rbc-event-label {
            color: ${colors.text.primary};
            font-size: 12px;
          }
          
          .rbc-event-content {
            color: ${colors.text.primary};
            font-size: 13px;
          }
          
          .rbc-selected {
            background-color: ${colors.accent.dark} !important;
          }
        `}
      </style>
      <Calendar
        localizer={localizer}
        date={viewDate}
        onNavigate={handleNavigate}
        view={currentView}
        onView={setCurrentView}
        views={
          enableMultipleViews ? ["month", "week", "day", "agenda"] : ["month"]
        }
        selectable
        onSelectSlot={handleSelectSlot}
        dayPropGetter={dayPropGetter}
        toolbar={true}
        events={[]}
        style={calendarStyles}
      />
    </div>
  );
};
