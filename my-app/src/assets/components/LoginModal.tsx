import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  Box, 
  Button, 
  TextField,
  IconButton,
  Typography 
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from "@mui/icons-material/Email";
import { supabase } from "./supabaseClient";
import { colors, commonStyles } from "../../theme";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export default function LoginModal({ open, onClose, onLoginSuccess }: LoginModalProps) {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert("Error with Google login: " + error.message);
    }
  };

  const handleEmailAuth = async () => {
    // Validation
    if (isSignUp) {
      if (!fullName.trim()) {
        alert("Full name is required");
        return;
      }
      if (!email.trim()) {
        alert("Email is required");
        return;
      }
      if (!phone.trim()) {
        alert("Phone number is required");
        return;
      }
      if (!password.trim()) {
        alert("Password is required");
        return;
      }
      if (password.length < 6) {
        alert("Password must be at least 6 characters");
        return;
      }
    } else {
      if (!email.trim() || !password.trim()) {
        alert("Email and password are required");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        });
        
        if (error) throw error;
        resetForm();
        onClose();
        
        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              { 
                id: data.user.id, 
                full_name: fullName,
                phone: phone,
                email: email
              }
            ]);
          
          if (profileError) console.error("Profile creation error:", profileError);
        }
        
        alert("Account created successfully! Check your email for confirmation.");
        resetForm();
        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        alert("Logged in successfully!");
        resetForm();
        onClose();
      }
    } catch (error: any) {
      alert("Error: " + error.message);
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
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const canSubmit = () => {
    if (isSignUp) {
      return fullName.trim() && email.trim() && phone.trim() && password.trim() && password.length >= 6;
    } else {
      return email.trim() && password.trim();
    }
  };

  const textFieldStyle = {
    mb: 2,
    '& .MuiInputLabel-root': { color: colors.text.secondary },
    '& .MuiOutlinedInput-root': {
      color: colors.text.primary,
      '& fieldset': { borderColor: colors.border.main },
      '&:hover fieldset': { borderColor: colors.accent.main },
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: commonStyles.dialog
      }}
    >
      <DialogContent sx={{ position: 'relative', padding: 4 }}>
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
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
              borderRadius: '50%',
              border: `3px solid ${colors.accent.main}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '3rem',
              color: colors.accent.main,
            }}
          >
            i
          </Box>
        </Box>

        <Typography variant="h4" textAlign="center" mb={2}>
          {isSignUp ? "Sign Up" : "Login"}
        </Typography>

        <Typography variant="body1" textAlign="center" mb={4} color={colors.text.secondary}>
          {isSignUp 
            ? "Create your account to start booking" 
            : "In order to see your user history you have to login first."}
        </Typography>

        {!showEmailForm ? (
          <>
            {/* Google Login Button */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              sx={{
                mb: 2,
                padding: '12px',
                color: colors.google.main,
                borderColor: colors.google.main,
                '&:hover': {
                  borderColor: colors.google.hover,
                  backgroundColor: 'rgba(255, 107, 107, 0.1)',
                }
              }}
            >
              CONTINUE WITH GOOGLE
            </Button>

            {/* Email Login Button */}
            <Button
              fullWidth
              variant="outlined"
              startIcon={<EmailIcon />}
              onClick={() => setShowEmailForm(true)}
              sx={{
                mb: 4,
                padding: '12px',
                color: colors.text.primary,
                borderColor: colors.text.primary,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              CONTINUE WITH EMAIL
            </Button>
          </>
        ) : (
          <>
            {/* Email Form */}
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
                '& .MuiFormHelperText-root': { color: colors.text.secondary }
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleEmailAuth}
              disabled={loading || !canSubmit()}
              sx={{
                mb: 2,
                padding: '12px',
                backgroundColor: colors.accent.main,
                '&:hover': { backgroundColor: colors.accent.hover },
                '&:disabled': {
                  backgroundColor: colors.border.main,
                  color: colors.text.tertiary
                }
              }}
            >
              {loading ? "Loading..." : isSignUp ? "Create Account" : "Sign In"}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={() => setIsSignUp(!isSignUp)}
              sx={{ color: colors.accent.main, mb: 2 }}
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
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
            <Typography variant="body1" textAlign="center" mb={2} color={colors.text.secondary}>
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
                  padding: '10px 30px',
                  backgroundColor: colors.accent.main,
                  '&:hover': { backgroundColor: colors.accent.hover },
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