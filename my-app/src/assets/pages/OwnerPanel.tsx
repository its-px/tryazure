import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Box } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { DateCalendar, PickersDay } from "@mui/x-date-pickers";

// Define the interface for our custom component props
interface CustomPickersDayProps {
  day: Dayjs;
  outsideCurrentMonth: boolean;
  isFirstVisibleCell: boolean;
  isLastVisibleCell: boolean;
  selected?: boolean;
  disabled?: boolean;
  today?: boolean;
  showDaysOutsideCurrentMonth?: boolean;
  bookedDates: string[];
  onDaySelect: (day: Dayjs) => void;
}

function BookedDay(props: CustomPickersDayProps) {
  const { bookedDates, day, ...other } = props;
  const isBooked = bookedDates.includes(day.format("YYYY-MM-DD"));

  return (
    <PickersDay
      {...other}
      day={day}
      sx={{
        backgroundColor: isBooked ? "rgba(255, 0, 0, 0.5)" : undefined,
        color: isBooked ? "white" : undefined,
        fontWeight: isBooked ? "bold" : undefined,
        "&:hover": {
          backgroundColor: isBooked ? "rgba(255, 0, 0, 0.7)" : undefined,
        },
        borderRadius: "50%",
      }}
    />
  );
}

export default function OwnerPanel() {
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  useEffect(() => {
    const loadBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("date");

      if (error) {
        console.error("Error loading bookings:", error);
      } else if (data) {
        setBookedDates(data.map((booking: { date: string }) => booking.date));
      }
    };

    loadBookings();
  }, []);

  return (
    <Box 
      display="flex" 
      flexDirection="column" 
      alignItems="center" 
      justifyContent="center"
      height="100vh"
      width="100vw"
      textAlign="center"
      sx={{
        background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        padding: 2
      }}
    >
      <h2 style={{ marginBottom: "20px", fontSize: "2rem", color: "#333" }}>
        Owner Panel
      </h2>
      
      <p style={{ marginBottom: "30px", fontSize: "1.2rem", color: "#666" }}>
        All booked dates ({bookedDates.length} total) - highlighted in red:
      </p>

      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: "15px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          padding: 3,
          "& .MuiDateCalendar-root": {
            width: "auto",
            height: "75wh",
          },
          "& .MuiPickersCalendarHeader-root": {
            fontSize: "1.5rem",
            fontWeight: "bold",
          },
          "& .MuiPickersDay-root": {
            fontSize: "1.1rem",
            width: "calc(75vw / 7)",
            height: "calc(75vh / 7)*1.1",
          },
          "& .MuiPickersCalendar-weekContainer": {
          minHeight: "auto", // avoid internal min height causing scroll
    },
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateCalendar
                value={dayjs()}
                onChange={() => {}}
                slots={{
          day: (dayProps) => (
            <BookedDay {...dayProps} bookedDates={bookedDates} />
          ),
        }}
      />

        </LocalizationProvider>
      </Box>

      {/* Summary section */}
      <Box
        sx={{
          marginTop: 1,
          padding: 2,
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          borderRadius: "10px",
          minWidth: "300px",
          maxHeight: "200px",
          overflowY: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0", color: "#333" }}>Recent Bookings:</h3>
        {bookedDates.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              justifyContent: "center",
            }}
          >
            {bookedDates.slice(0, 10).map((date, index) => (
              <span
                key={index}
                style={{
                  backgroundColor: "rgba(255, 0, 0, 0.1)",
                  color: "#d32f2f",
                  padding: "4px 8px",
                  borderRadius: "5px",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                }}
              >
                {dayjs(date).format("MMM DD")}
              </span>
            ))}
            {bookedDates.length > 10 && (
              <span style={{ color: "#666", fontStyle: "italic" }}>
                ...and {bookedDates.length - 10} more
              </span>
            )}
          </Box>
        ) : (
          <p style={{ color: "#666", fontStyle: "italic" }}>No bookings yet</p>
        )}
      </Box>
    </Box>
  );
}