import { createTheme } from "@mui/material/styles";

// Color palette
export const colors = {
  primary: {
    main: "#2e7d32",
    light: "#4caf50",
    dark: "#1b5e20",
    hover: "#1b5e20",
  },
  secondary: {
    main: "#0dc4edff",
    hover: "#5bb3d1",
    light: "#87ceeb",
  },
  background: {
    dark: "#000000ff",
    medium: "#2e2e2e",
    light: "#f5f5f5",
    card: "#555555ff",
    overlay: "rgba(124, 59, 59, 0.1)",
  },
  text: {
    primary: "#fff",
    secondary: "#ccc",
    tertiary: "#999",
    dark: "#666",
    muted: "gray",
  },
  status: {
    confirmed: "#4caf50",
    pending: "#ff9800",
    cancelled: "#f44336",
    default: "#9e9e9e",
  },
  error: {
    main: "#d32f2f",
    dark: "#b71c1c",
    light: "#ff5252",
  },
  border: {
    main: "#555",
    divider: "#2e7d32",
  },
  warning: {
    background: "#fff3cd",
    border: "#ffc107",
    text: "#856404",
  },
  info: {
    background: "#e3f2fd",
  },
  google: {
    main: "#ff6b6b",
    hover: "#ff5252",
  },
};

// Common styling patterns
export const commonStyles = {
  card: {
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    borderRadius: "10px",
  },
  cardElevated: {
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  },
  button: {
    borderRadius: "20px",
    padding: "6px 16px",
  },
  iconButton: {
    width: 60,
    height: 60,
    md: {
      width: 80,
      height: 80,
    },
  },
  avatar: {
    borderRadius: "50%",
    backgroundColor: colors.primary.main,
  },
  statusBadge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "12px",
    color: "white",
    fontSize: "0.75rem",
    fontWeight: "bold",
  },
  dialog: {
    backgroundColor: colors.background.medium,
    color: colors.text.primary,
    borderRadius: "15px",
  },
};

// MUI theme override
export const muiTheme = createTheme({
  palette: {
    primary: {
      main: colors.primary.main,
      light: colors.primary.light,
      dark: colors.primary.dark,
    },
    secondary: {
      main: colors.secondary.main,
    },
    error: {
      main: colors.error.main,
    },
    background: {
      default: colors.background.dark,
      paper: colors.background.medium,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

export const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return colors.status.confirmed;
    case "pending":
      return colors.status.pending;
    case "cancelled":
      return colors.status.cancelled;
    default:
      return colors.status.default;
  }
};

export const getActiveStyle = (isActive: boolean) => ({
  backgroundColor: isActive ? colors.secondary.main : colors.background.card,
  fontWeight: isActive ? "bold" : "normal",
});
