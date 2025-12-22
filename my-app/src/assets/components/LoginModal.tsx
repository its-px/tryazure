import { useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Button,
  TextField,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from "@mui/icons-material/Email";
import { supabase } from "./supabaseClient";
import { useSelector } from "react-redux";
import type { RootState } from "../../configureStore";
import { getColors, getCommonStyles } from "../../theme";
import validator from "validator";
import { useNavigate } from "react-router-dom";

// const debugBreak = () => {
//   if (import.meta.env.MODE === "development") debugger;
// };

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LoginModal({ open, onClose }: LoginModalProps) {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const colors = getColors(mode);
  const common = getCommonStyles(colors);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  // const [error, setError] = useState("");

  const navigate = useNavigate();

  // ----- GOOGLE LOGIN -----
  const handleGoogleLogin = async () => {
    try {
      // Store current path to redirect back to it after OAuth
      const currentPath = window.location.pathname;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${currentPath}`,
        },
      });
      if (error) throw error;
      // Note: OAuth redirects the browser, so code after this won't execute
      // The OAuth callback will be handled in App.tsx
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      alert("Error with Google login: " + msg);
    }
  };

  // ----- EMAIL LOGIN / SIGNUP -----
  const handleEmailAuth = async () => {
    // Validation
    if (!email.trim() || !password.trim()) {
      alert("Email and password are required");
      return;
    }

    if (isSignUp) {
      if (!fullName.trim()) {
        alert("Full name is required");
        return;
      }
      if (!phone.trim()) {
        alert("Phone number is required");
        return;
      }
      if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }

      const trimmedEmail = email.trim();
      if (!validator.isEmail(trimmedEmail)) {
        alert("Invalid email format");
        return;
      }

      const allowedDomains = [
        "gmail.com",
        "yahoo.com",
        "outlook.com",
        "hotmail.com",
        "live.com",
        "icloud.com",
      ];
      const domain = trimmedEmail.split("@")[1]?.toLowerCase();
      if (!allowedDomains.includes(domain)) {
        alert("Only common email domains allowed");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, phone } },
        });
        if (error) throw error;

        // Insert profile with default role "user"
        if (data?.user) {
          await supabase.from("profiles").insert([
            {
              id: data.user.id,
              full_name: fullName,
              phone,
              email,
              role: "user",
            },
          ]);
        } else {
          console.error(
            "Sign-up succeeded but no user data returned from Supabase."
          );
        }

        alert("Account created! Check your email for confirmation.");
        resetForm();
        onClose();
        // Don't navigate after sign up - let user stay on current page
      } else {
        // Login
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        //debugBreak();
        if (error) throw error;

        // Store session in localStorage for consistency with App.tsx
        if (authData?.session) {
          const sessionData = {
            access_token: authData.session.access_token,
            refresh_token: authData.session.refresh_token,
            expires_in: authData.session.expires_in,
            expires_at: authData.session.expires_at,
            token_type: authData.session.token_type || "bearer",
            user: authData.session.user,
          };
          localStorage.setItem("sb-auth-token", JSON.stringify(sessionData));
          console.log("[LoginModal] Session stored in localStorage");
        }

        // Get user from session after login
        const user = authData?.user;
        // debugBreak();
        if (!user) {
          throw new Error("Failed to get user after login");
        }

        // Fetch role and profile info by user ID
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, full_name, phone")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          // Profile might not exist - trigger profile completion
          resetForm();
          onClose();
          // Dispatch event to show CompleteProfileModal
          window.dispatchEvent(new CustomEvent('show-complete-profile'));
          return;
        }

        const role = profile?.role;
        const isProfileIncomplete = !profile?.full_name || !profile?.phone;
        
        console.log("[LoginModal] User role:", role, "Profile incomplete:", isProfileIncomplete);
        
        resetForm();
        onClose();

        // If profile is incomplete, show the complete profile modal
        if (isProfileIncomplete) {
          console.log("[LoginModal] Profile incomplete, triggering CompleteProfileModal");
          window.dispatchEvent(new CustomEvent('show-complete-profile'));
          // Still redirect based on role after modal is shown
        }

        // Redirect based on role after successful login
        // Use setTimeout to ensure modal closes first and state updates
        setTimeout(() => {
          console.log("[LoginModal] Redirecting user with role:", role);
          if (role === "admin") {
            console.log("[LoginModal] Navigating to /admin");
            navigate("/admin");
          } else if (role === "owner") {
            console.log("[LoginModal] Navigating to /owner");
            navigate("/owner");
          } else if (role === "user") {
            // If user is on admin/owner page, redirect to user panel
            // Otherwise stay on current page (important for booking flow)
            if (window.location.pathname === "/admin" || window.location.pathname === "/owner") {
              console.log("[LoginModal] User on protected route, navigating to /");
              navigate("/");
            } else {
              console.log("[LoginModal] User staying on current page:", window.location.pathname);
            }
          }
        }, 100);
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      alert("Error: " + msg);
    } finally {
      setLoading(false);
    }
  };

  // ----- FORGOT PASSWORD -----
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      alert("Please enter your email address");
      return;
    }

    const trimmedEmail = email.trim();
    if (!validator.isEmail(trimmedEmail)) {
      alert("Invalid email format");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        trimmedEmail,
        {
          redirectTo: `${window.location.origin}/`,
        }
      );

      if (error) throw error;

      setResetEmailSent(true);
      alert("Password reset email sent! Check your inbox.");
    } catch (err: unknown) {
      const msg = (err as Error)?.message ?? String(err);
      alert("Error sending reset email: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setShowEmailForm(false);
    setEmail("");
    setPassword("");
    setFullName("");
    setPhone("");
    setIsSignUp(false);
    setShowForgotPassword(false);
    setResetEmailSent(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canSubmit = () => {
    if (isSignUp) return fullName && email && phone && password.length >= 6;
    else return email && password;
  };

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
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: common.dialog }}
    >
      <DialogContent sx={{ position: "relative", padding: 4 }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: colors.text.primary,
          }}
        >
          <CloseIcon />
        </IconButton>

        {/* Info Icon */}
        <Box display="flex" justifyContent="center" mb={2}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: `3px solid ${colors.accent.main}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "3rem",
              color: colors.accent.main,
            }}
          >
            i
          </Box>
        </Box>

        <Typography variant="h4" textAlign="center" mb={2}>
          {isSignUp ? "Sign Up" : "Login"}
        </Typography>
        <Typography
          variant="body1"
          textAlign="center"
          mb={4}
          color={colors.text.secondary}
        >
          {isSignUp
            ? "Create your account to start booking"
            : "In order to see your user history you have to login first."}
        </Typography>

        {!showEmailForm ? (
          <>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{
                mb: 2,
                padding: "12px",
                color: colors.google.main,
                borderColor: colors.google.main,
                "&:hover": {
                  borderColor: colors.google.hover,
                  backgroundColor: "rgba(255, 107, 107, 0.1)",
                },
              }}
            >
              CONTINUE WITH GOOGLE
            </Button>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={() => setShowEmailForm(true)}
              sx={{
                mb: 4,
                padding: "12px",
                color: colors.text.primary,
                borderColor: colors.text.primary,
                "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.1)" },
              }}
            >
              CONTINUE WITH EMAIL
            </Button>
          </>
        ) : (
          <>
            {isSignUp && (
              <>
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
              </>
            )}
            <TextField
              fullWidth
              label="Email *"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={textFieldStyle}
            />
            {!showForgotPassword && (
              <TextField
                fullWidth
                label="Password *"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                helperText={isSignUp ? "Minimum 6 characters" : ""}
                sx={{
                  ...textFieldStyle,
                  "& .MuiFormHelperText-root": { color: colors.text.secondary },
                }}
              />
            )}

            {showForgotPassword ? (
              <>
                {resetEmailSent ? (
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      backgroundColor: colors.accent.main + "20",
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="body2"
                      color={colors.text.primary}
                      textAlign="center"
                    >
                      Password reset email sent! Check your inbox and follow the
                      instructions.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleForgotPassword}
                      disabled={loading || !email.trim()}
                      sx={{
                        mb: 2,
                        padding: "12px",
                        backgroundColor: colors.accent.main,
                        "&:hover": { backgroundColor: colors.accent.hover },
                        "&:disabled": {
                          backgroundColor: colors.border.main,
                          color: colors.text.tertiary,
                        },
                      }}
                    >
                      {loading ? "Sending..." : "Send Reset Email"}
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      onClick={() => setShowForgotPassword(false)}
                      sx={{ mb: 2, color: colors.text.secondary }}
                    >
                      Back to Sign In
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleEmailAuth}
                  disabled={loading || !canSubmit()}
                  sx={{
                    mb: 2,
                    padding: "12px",
                    backgroundColor: colors.accent.main,
                    "&:hover": { backgroundColor: colors.accent.hover },
                    "&:disabled": {
                      backgroundColor: colors.border.main,
                      color: colors.text.tertiary,
                    },
                  }}
                >
                  {loading
                    ? "Loading..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </Button>
                {!isSignUp && (
                  <Button
                    fullWidth
                    variant="text"
                    onClick={() => setShowForgotPassword(true)}
                    sx={{
                      mb: 2,
                      color: colors.accent.main,
                      fontSize: "0.875rem",
                    }}
                  >
                    Forgot Password?
                  </Button>
                )}
              </>
            )}

            <Button
              fullWidth
              variant="text"
              onClick={() => setIsSignUp(!isSignUp)}
              sx={{ color: colors.accent.main, mb: 2 }}
            >
              {isSignUp
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={resetForm}
              sx={{ color: colors.text.secondary }}
            >
              Back to login options
            </Button>
          </>
        )}

        {!showEmailForm && !isSignUp && (
          <>
            <Typography
              variant="body1"
              textAlign="center"
              mb={2}
              color={colors.text.secondary}
            >
              No profile yet?
            </Typography>
            <Box display="flex" justifyContent="center">
              <Button
                variant="contained"
                onClick={() => {
                  setShowEmailForm(true);
                  setIsSignUp(true);
                }}
                sx={{
                  padding: "10px 30px",
                  backgroundColor: colors.accent.main,
                  "&:hover": { backgroundColor: colors.accent.hover },
                }}
              >
                Create new profile
              </Button>
            </Box>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
