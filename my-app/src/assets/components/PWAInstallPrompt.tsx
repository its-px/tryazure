import { useEffect, useState } from "react";
import { Box, Button, Typography, IconButton, Paper, Avatar } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { motion, AnimatePresence } from "framer-motion";

const VISIT_KEY = "pwa_install_visits";
const INSTALLED_KEY = "pwa_installed";
const DISMISSED_KEY = "pwa_dismissed";

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  
  const logoPath = "/logo.png"; 

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const installed = localStorage.getItem(INSTALLED_KEY);

    if (installed === "true") return;

    let visits = Number(localStorage.getItem(VISIT_KEY) || "0");
    visits += 1;
    localStorage.setItem(VISIT_KEY, visits.toString());

    if (!dismissed || visits >= 3) {
      setShowPrompt(true);
      localStorage.removeItem(VISIT_KEY);
    }
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
      setShowPrompt(false);
    } else {
      localStorage.setItem(DISMISSED_KEY, "true");
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
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
            bottom: 20,
            right: 20,
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
              <IconButton size="small" onClick={handleDismiss} sx={{ color: "#fff" }}>
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
