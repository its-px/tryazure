import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { supabase } from "../components/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";

// Public, unauthenticated landing page for the one-tap confirm/cancel links
// sent in booking SMS. No login required by design.
export default function BookingActionPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  const [state, setState] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token || (action !== "confirm" && action !== "cancel")) {
      setState("error");
      setMessage("This link is invalid.");
      return;
    }

    supabase.functions
      .invoke("booking-sms-action", { body: { token, action } })
      .then(({ data, error }) => {
        if (error || !data?.success) {
          setState("error");
          setMessage(data?.error || error?.message || "Something went wrong.");
          return;
        }
        setState("success");
        setStatus(data.status);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : String(err));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        textAlign: "center",
        p: 3,
        gap: 2,
      }}
    >
      {state === "loading" && <LoadingScreen variant="full" />}
      {state === "success" && (
        <Typography variant="h6" color="success.main">
          {status === "confirmed"
            ? "Your booking is confirmed. See you then!"
            : "Your booking has been cancelled."}
        </Typography>
      )}
      {state === "error" && (
        <Typography variant="h6" color="error.main">
          {message}
        </Typography>
      )}
    </Box>
  );
}
