import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { supabase } from "../assets/components/supabaseClient";

// Target of the opt-out link in marketing emails/SMS. Needs a click on purpose:
// mail scanners open links, and they must not unsubscribe people.
export default function UnsubscribePage() {
  const { t } = useTranslation();
  const token = useSearchParams()[0].get("t");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(token ? "idle" : "error");

  const unsubscribe = async () => {
    setState("busy");
    const { data, error } = await supabase.functions.invoke("unsubscribe", { body: { token } });
    setState(error || !data?.success ? "error" : "done");
  };

  return (
    <Box sx={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 2, p: 3 }}>
      {state === "done" ? (
        <Typography variant="h6" color="success.main">{t("unsubscribe.done")}</Typography>
      ) : state === "error" ? (
        <Typography variant="h6" color="error">{t("unsubscribe.invalid")}</Typography>
      ) : (
        <>
          <Typography variant="h6">{t("unsubscribe.question")}</Typography>
          <Typography variant="body2">{t("unsubscribe.note")}</Typography>
          <Button variant="contained" onClick={unsubscribe} disabled={state === "busy"}>
            {t("unsubscribe.button")}
          </Button>
        </>
      )}
      <a href="/">{t("legal.home")}</a>
    </Box>
  );
}
