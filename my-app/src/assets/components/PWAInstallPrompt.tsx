import { useEffect, useState } from "react";
import { Box, Button, Typography, IconButton, Paper, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";

const VISIT_KEY = "pwa_install_visits";
const INSTALLED_KEY = "pwa_installed";
const SNOOZED_KEY = "pwa_snoozed_until";
const MIN_VISITS = 3;
const SNOOZE_DAYS = 7;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  const logoPath = "/logo.png";

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();

      if (localStorage.getItem(INSTALLED_KEY) === "true") return;

      const snoozedUntil = Number(localStorage.getItem(SNOOZED_KEY) || "0");
      if (Date.now() < snoozedUntil) return;

      let visits = Number(localStorage.getItem(VISIT_KEY) || "0") + 1;
      localStorage.setItem(VISIT_KEY, visits.toString());

      if (visits >= MIN_VISITS) {
        setDeferredPrompt(e);
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
    } else {
      snooze();
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const snooze = () => {
    localStorage.setItem(SNOOZED_KEY, String(Date.now() + SNOOZE_DAYS * 86400_000));
    localStorage.removeItem(VISIT_KEY);
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "fixed",
            bottom: "calc(20px + env(safe-area-inset-bottom))",
            right: "calc(20px + env(safe-area-inset-right))",
            zIndex: 2000,
          }}
        >
          <Paper
            elevation={10}
            sx={{
              p: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              borderRadius: 3,
              maxWidth: 320,
              backgroundColor: "#616161b9",
              color: "#fff",
              boxShadow: "0px 4px 20px rgba(0,0,0,0.25)",
            }}
          >
            <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <Avatar src={logoPath} alt="App Logo" sx={{ width: 32, height: 32 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  Install Our App
                </Typography>
              </Box>
              <IconButton size="small" onClick={snooze} sx={{ color: "#fff" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            <Typography variant="body2" mt={1} sx={{ color: "#f0f0f0" }}>
              Get faster access by installing this app on your home screen.
            </Typography>

            <Button
              variant="contained"
              size="small"
              sx={{ mt: 1, alignSelf: "flex-end", backgroundColor: "#1b5e20", color: "#ffffffff", fontWeight: "bold" }}
              onClick={handleInstall}
            >
              Install
            </Button>
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
