import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { supabase } from "../components/supabaseClient";
import LoadingScreen from "../components/LoadingScreen";
import { useTranslation } from "react-i18next";

// Public, unauthenticated landing page for the confirm/cancel links sent in
// booking SMS/emails. No login required by design. The action runs only when the
// visitor presses the button: mail/SMS link scanners and previews that render the
// page (even with JavaScript) must not confirm or cancel a booking by themselves.
export default function BookingActionPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  const [state, setState] = useState<"ready" | "loading" | "success" | "error">(
    "ready",
  );
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!token || (action !== "confirm" && action !== "cancel")) {
      setState("error");
      setMessage(t("booking_action.invalid"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    setState("loading");
    supabase.functions
      .invoke("booking-sms-action", { body: { token, action } })
      .then(({ data, error }) => {
        if (error || !data?.success) {
          setState("error");
          setMessage(data?.error || error?.message || t("common.something_wrong"));
          return;
        }
        setState("success");
        setStatus(data.status);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : String(err));
      });
  };

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
      {state === "ready" && (
        <>
          <Typography variant="h6">
            {action === "confirm" ? t("booking_action.ask_confirm") : t("booking_action.ask_cancel")}
          </Typography>
          <Button variant="contained" color={action === "confirm" ? "primary" : "error"} onClick={run}>
            {action === "confirm" ? t("booking_action.do_confirm") : t("booking_action.do_cancel")}
          </Button>
        </>
      )}
      {state === "loading" && <LoadingScreen variant="full" />}
      {state === "success" && (
        <Typography variant="h6" color="success.main">
          {status === "confirmed"
            ? t("booking_action.confirmed")
            : t("booking_action.cancelled")}
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
