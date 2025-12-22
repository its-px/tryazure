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
      console.log("[CompleteProfileModal] Getting user from localStorage...");

      // Get user from localStorage instead of hanging Supabase client
      const storedSession = localStorage.getItem("sb-auth-token");
      if (!storedSession) {
        throw new Error("No session found - please log in again");
      }

      const session = JSON.parse(storedSession);
      if (!session.user || !session.access_token) {
        throw new Error("Invalid session - please log in again");
      }

      const user = session.user;
      console.log("[CompleteProfileModal] User ID:", user.id);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const headers = {
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      };

      // Try to update profile first
      console.log("[CompleteProfileModal] Updating profile...");
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({
            full_name: fullName.trim(),
            phone: phone.trim(),
          }),
        }
      );

      if (updateResponse.ok) {
        console.log("[CompleteProfileModal] Profile updated successfully");
        setFullName("");
        setPhone("");
        onClose();
        // Trigger page reload to refresh UI with new profile data
        window.location.reload();
        return;
      }
      
      // If update failed with 404, the profile doesn't exist - try to create it
      if (updateResponse.status === 404) {
        console.log("[CompleteProfileModal] Profile not found, creating new profile...");
        const insertResponse = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            id: user.id,
            email: user.email || userEmail || "",
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: "user",
          }),
        });

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error("[CompleteProfileModal] Insert failed:", errorText);
          throw new Error(`Failed to create profile: ${errorText}`);
        }

        console.log("[CompleteProfileModal] Profile created successfully");
        setFullName("");
        setPhone("");
        onClose();
        window.location.reload();
        return;
      }
      
      // Update failed for some other reason
      const errorText = await updateResponse.text();
      console.error("[CompleteProfileModal] Update failed:", errorText);
      throw new Error(`Failed to update profile: ${errorText}`);
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
