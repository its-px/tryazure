import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: {
      main: "#2e7d32", // Green - for primary actions
      dark: "#1b5e20",
      light: "#4caf50",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#333333", // Dark gray
      dark: "#1e1e1e",
      light: "#555555",
      contrastText: "#ffffff",
    },
    error: {
      main: "#f44336",
      dark: "#d32f2f",
    },
    warning: {
      main: "#ff9800",
      dark: "#f57c00",
    },
    info: {
      main: "#2196f3",
      dark: "#1976d2",
    },
    success: {
      main: "#4caf50",
      dark: "#388e3c",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    text: {
      primary: "#333333",
      secondary: "#666666",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 600,
      color: "#333333",
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      color: "#333333",
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      color: "#333333",
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      color: "#333333",
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      color: "#333333",
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      color: "#333333",
    },
    body1: {
      fontSize: "1rem",
      color: "#333333",
    },
    body2: {
      fontSize: "0.875rem",
      color: "#666666",
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "8px",
          padding: "10px 20px",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          },
        },
        outlined: {
          borderWidth: "2px",
          "&:hover": {
            borderWidth: "2px",
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "translateY(-2px)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "10px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "15px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
          },
        },
      },
    },
  },
});

// Export color constants for use in inline styles
export const colors = {
  primary: "#2e7d32",
  primaryDark: "#1b5e20",
  primaryLight: "#4caf50",
  secondary: "#333333",
  secondaryDark: "#1e1e1e",
  secondaryLight: "#555555",
  background: "#f5f7fa",
  backgroundPaper: "#ffffff",
  textPrimary: "#333333",
  textSecondary: "#666666",
  error: "#f44336",
  warning: "#ff9800",
  success: "#4caf50",
  info: "#2196f3",
};
