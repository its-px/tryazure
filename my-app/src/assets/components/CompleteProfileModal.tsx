import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { supabase } from "./supabaseClient";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors, getCommonStyles } from "../../theme";

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not found");
      }

      // Update profile with phone and name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
        })
        .eq("id", user.id);

      if (profileError) {
        // If profile doesn't exist, create it
        const { error: insertError } = await supabase.from("profiles").insert([
          {
            id: user.id,
            email: user.email || userEmail || "",
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "user",
          },
        ]);

        if (insertError) throw insertError;
      }

      setFullName("");
      setPhone("");
      onClose();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
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
      PaperProps={{ sx: commonStyles.dialog }}
    >
      <DialogContent sx={{ position: "relative", padding: 4 }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: colors.text.primary,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Typography variant="h5" textAlign="center" mb={2}>
          Complete Your Profile
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          mb={4}
          color={colors.text.secondary}
        >
          Please provide your name and phone number to complete your account
          setup.
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
