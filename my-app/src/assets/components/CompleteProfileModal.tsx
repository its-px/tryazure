import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Link,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { getCommonStyles } from "../../theme";
import { useResolvedColors } from "../../hooks/useResolvedColors";
import { supabase } from "./supabaseClient";

interface CompleteProfileModalProps {
  open: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function CompleteProfileModal({
  open,
  userEmail,
}: CompleteProfileModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  // Soft opt-in (Law 3471/2006 art. 11§3): existing clients may get rebooking
  // and review messages unless they object here or via any message's link.
  const [noMarketing, setNoMarketing] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      alert(t("login.name_required"));
      return;
    }
    if (!phone.trim()) {
      alert(t("login.phone_required"));
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

      // Referral attribution: only set on first completion, never overwrite.
      // ponytail: single lookup by code, no fraud checks (self-referral etc) —
      // fine for a v1 attribution signal, not a monetary reward yet.
      let referredBy: string | undefined;
      const refCode = localStorage.getItem("referralCode");
      if (refCode) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("referred_by")
          .eq("id", user.id)
          .maybeSingle();
        if (!existing?.referred_by) {
          // Security-definer RPC — profiles RLS blocks selecting someone
          // else's row directly, so a plain .eq("referral_code") lookup
          // silently returned nothing.
          const { data: referrerId } = await supabase.rpc(
            "get_profile_id_by_referral_code",
            { p_code: refCode },
          );
          if (referrerId && referrerId !== user.id) referredBy = referrerId;
        }
        localStorage.removeItem("referralCode");
      }

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email || userEmail || "",
          full_name: fullName.trim(),
          phone: phone.trim(),
          terms_accepted_at: new Date().toISOString(),
          marketing_opt_out: noMarketing,
          ...(referredBy ? { referred_by: referredBy } : {}),
        },
        {
          onConflict: "id",
        },
      );

      if (upsertError) {
        console.error(
          "[CompleteProfileModal] Profile upsert failed:",
          upsertError,
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
          syncError,
        );
        // Don't throw - profile was updated successfully
      }

      // Trigger page reload to refresh UI with new profile data
      // Reload before calling onClose to avoid stale callback error
      window.location.reload();
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      console.error("[CompleteProfileModal] Error:", msg);
      alert(t("profile.save_error", { error: msg }));
    } finally {
      setLoading(false);
    }
  };

  const colors = useResolvedColors();
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
          {t("profile.title")}
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          mb={1}
          color={colors.text.secondary}
        >
          {t("profile.subtitle")}
        </Typography>
        <Typography
          variant="body2"
          textAlign="center"
          mb={4}
          color={colors.accent.main}
          fontWeight="medium"
        >
          {t("profile.required")}
        </Typography>

        <TextField
          fullWidth
          label={`${t("account.full_name")} *`}
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          sx={textFieldStyle}
        />
        <TextField
          fullWidth
          label={`${t("account.phone")} *`}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          sx={textFieldStyle}
        />

        <FormControlLabel
          control={<Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} />}
          label={
            <Typography variant="body2">
              {t("signup.accept_terms_pre")}
              <Link href="/terms" target="_blank" rel="noopener">{t("legal.terms")}</Link>
              {t("signup.accept_terms_and")}
              <Link href="/privacy" target="_blank" rel="noopener">{t("legal.privacy")}</Link> *
            </Typography>
          }
        />
        <FormControlLabel
          sx={{ mb: 2 }}
          control={<Checkbox checked={noMarketing} onChange={(e) => setNoMarketing(e.target.checked)} />}
          label={<Typography variant="body2">{t("signup.no_marketing")}</Typography>}
        />

        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !fullName.trim() || !phone.trim() || !acceptTerms}
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
          {loading ? t("common.saving") : t("profile.submit")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
