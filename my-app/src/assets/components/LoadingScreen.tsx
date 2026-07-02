import { useEffect, useState } from "react";
import { Box, CircularProgress } from "@mui/material";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useResolvedColors } from "../../hooks/useResolvedColors";

const PHRASES = [
  "Just a moment...",
  "Almost there...",
  "Getting things ready...",
];

interface LoadingScreenProps {
  variant?: "full" | "inline";
}

export default function LoadingScreen({ variant = "full" }: LoadingScreenProps) {
  const colors = useResolvedColors();
  const prefersReducedMotion = useReducedMotion();
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, 2000);
    return () => clearInterval(id);
  }, [prefersReducedMotion]);

  return (
    <Box
      data-testid="loading-screen"
      sx={
        variant === "full"
          ? {
              position: "fixed",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              backgroundColor: colors.background.light,
              zIndex: 1300,
            }
          : {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.5,
              py: 4,
            }
      }
    >
      <motion.div
        animate={prefersReducedMotion ? undefined : { scale: [1, 1.15, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <CircularProgress
          size={variant === "full" ? 44 : 32}
          sx={{ color: colors.accent.main }}
        />
      </motion.div>
      {prefersReducedMotion ? (
        <Box sx={{ color: colors.text.secondary, fontSize: 14 }}>{PHRASES[0]}</Box>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={phraseIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            style={{ color: colors.text.secondary, fontSize: 14 }}
          >
            {PHRASES[phraseIndex]}
          </motion.div>
        </AnimatePresence>
      )}
    </Box>
  );
}
