import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors, getCommonStyles } from "../../theme";
import { supabase } from "./supabaseClient";

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function CompleteProfileModal({
  open,
  onClose,
  userEmail,
}: CompleteProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      alert("Full name is required");
      return;
    }
    if (!phone.trim()) {
      alert("Phone number is required");
      return;
    }

    setLoading(true);
    try {
      console.log("[CompleteProfileModal] Getting current user...");

      // Get current user session
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("No user session found - please log in again");
      }

      console.log("[CompleteProfileModal] User ID:", user.id);

      // Step 1: Update auth metadata (for email auth, phone goes in user_metadata)
      console.log("[CompleteProfileModal] Updating auth metadata...");
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(), // Store phone in user metadata
        },
      });

      if (authError) {
        console.error("[CompleteProfileModal] Auth update failed:", authError);
        throw new Error(`Failed to update auth metadata: ${authError.message}`);
      }

      console.log("[CompleteProfileModal] Auth metadata updated successfully");

      // Step 2: Update or create profile in profiles table
      console.log("[CompleteProfileModal] Updating profile table...");

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || userEmail || "",
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: "user",
        },
        {
          onConflict: "id",
        }
      );

      if (upsertError) {
        console.error(
          "[CompleteProfileModal] Profile upsert failed:",
          upsertError
        );
        throw new Error(`Failed to update profile: ${upsertError.message}`);
      }

      console.log("[CompleteProfileModal] Profile updated successfully");

      // Step 3: Sync phone to auth.users.phone field using Edge Function
      try {
        await supabase.functions.invoke("sync-user-phone", {
          body: { userId: user.id, phone: phone.trim() },
        });
        console.log("[CompleteProfileModal] Phone synced to auth successfully");
      } catch (syncError) {
        console.error(
          "[CompleteProfileModal] Error syncing phone to auth:",
          syncError
        );
        // Don't throw - profile was updated successfully
      }

      setFullName("");
      setPhone("");
      onClose();

      // Trigger page reload to refresh UI with new profile data
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      console.error("[CompleteProfileModal] Error:", msg);
      alert("Error saving profile: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const commonStyles = getCommonStyles(colors);

  const textFieldStyle = {
    mb: 2,
    "& .MuiInputLabel-root": { color: colors.text.secondary },
    "& .MuiOutlinedInput-root": {
      color: colors.text.primary,
      "& fieldset": { borderColor: colors.border.main },
      "&:hover fieldset": { borderColor: colors.accent.main },
    },
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{ sx: commonStyles.dialog }}
    >
      <DialogContent sx={{ position: "relative", padding: 4 }}>
        {/* Close button removed - profile completion is mandatory */}

        <Typography variant="h5" textAlign="center" mb={2}>
          Complete Your Profile
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          mb={1}
          color={colors.text.secondary}
        >
          Please provide your name and phone number to complete your account
          setup.
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          mb={4}
          color={colors.accent.main}
          fontWeight="medium"
        >
          This information is required to continue using the app.
        </Typography>

        <TextField
          fullWidth
          label="Full Name *"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          sx={textFieldStyle}
        />
        <TextField
          fullWidth
          label="Phone Number *"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          sx={textFieldStyle}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !fullName.trim() || !phone.trim()}
          sx={{
            padding: "12px",
            backgroundColor: colors.accent.main,
            "&:hover": { backgroundColor: colors.accent.hover },
            "&:disabled": {
              backgroundColor: colors.border.main,
              color: colors.text.tertiary,
            },
          }}
        >
          {loading ? "Saving..." : "Complete Profile"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
