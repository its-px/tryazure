import { useState } from "react";
import { Button, Typography, Paper } from "@mui/material";

const STORAGE_KEY = "cookieConsent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => !localStorage.getItem(STORAGE_KEY),
  );

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  };

  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 2000,
        p: 2,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 2,
        justifyContent: "space-between",
        maxWidth: 600,
        mx: "auto",
      }}
    >
      <Typography variant="body2">
        We use cookies to improve your experience. By using this site, you
        agree to our use of cookies.
      </Typography>
      <Button variant="contained" size="small" onClick={accept}>
        Got it
      </Button>
    </Paper>
  );
}
