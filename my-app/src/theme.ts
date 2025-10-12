import { createTheme } from "@mui/material/styles";

// Single accent color palette - GREEN with DARK theme
export const colors = {
  accent: {
    main: "#2e7d32", // Main green accent
    light: "#4caf50", // Lighter green
    dark: "#1b5e20", // Darker green
    hover: "#1b5e20", // Hover state
  },
  background: {
    dark: "#1e1e1e", // Main dark background
    medium: "#2e2e2e", // Medium dark (cards)
    card: "#3a3a3a", // Card background (lighter than medium)
    light: "#4a4a4a", // Light gray for contrast
    overlay: "rgba(46, 125, 50, 0.1)", // Green overlay
  },
  text: {
    primary: "#ffffff", // White text
    secondary: "#cccccc", // Light gray text
    tertiary: "#999999", // Muted gray
    dark: "#333333", // Dark text for light backgrounds
    muted: "#808080", // Gray
  },
  status: {
    confirmed: "#2e7d32", // Green for confirmed
    pending: "#2e7d32", // Green for pending
    cancelled: "#f44336", // Red for cancelled only
    default: "#9e9e9e", // Gray default
  },
  error: {
    main: "#d32f2f",
    dark: "#b71c1c",
  },
  border: {
    main: "#555555",
    accent: "#2e7d32", // Green border
  },
  neutral: {
    white: "#ffffff",
    lightGray: "#f5f5f5",
    mediumGray: "#cccccc",
    darkGray: "#666666",
    disabled: "#999999",
  },
  // Aliases for backward compatibility
  primary: {
    main: "#2e7d32",
    light: "#4caf50",
    dark: "#1b5e20",
    hover: "#1b5e20",
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
    padding: { xs: "6px 12px", sm: "6px 16px" },
  },
  iconButton: {
    width: { xs: 50, sm: 60, md: 80 },
    height: { xs: 50, sm: 60, md: 80 },
  },
  avatar: {
    borderRadius: "50%",
    backgroundColor: colors.accent.main,
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
  container: {
    padding: { xs: 2, sm: 3, md: 4 },
    maxWidth: "1200px",
    margin: "0 auto",
  },
  pageContainer: {
    padding: { xs: 2, sm: 3, md: 4 },
    minHeight: "100vh",
  },
};

// Component-specific colors (all using green accent with dark backgrounds)
export const componentColors = {
  navigationButton: {
    background: "#2e2e2e", // Dark background instead of green
    text: "#ffffff",
    border: "#2e7d32",
    disabled: {
      background: "#555555",
      text: "#999999",
    },
  },
  serviceCard: {
    background: "#2e2e2e", // Dark card background
    border: "#555555", // Dark border
    selected: "#2e7d32", // Green when selected
    selectedBorder: "#2e7d32",
    text: "#ffffff", // White text
    textSelected: "#ffffff",
  },
  locationCard: {
    background: "#2e2e2e", // Dark card background
    border: "#555555", // Dark border
    hover: "#3a3a3a", // Slightly lighter on hover
    text: "#ffffff", // White text
  },
  chip: {
    background: "#3a3a3a",
    border: "#2e7d32",
    text: "#2e7d32",
    hover: {
      background: "rgba(46, 125, 50, 0.2)",
    },
  },
  activeButton: {
    background: "#2e7d32",
    text: "#ffffff",
  },
  inactiveButton: {
    background: "#555555",
    text: "#ffffff",
  },
};

// MUI theme override - single accent color with dark theme
export const muiTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: colors.accent.main,
      light: colors.accent.light,
      dark: colors.accent.dark,
    },
    secondary: {
      main: colors.accent.main, // Use same green for secondary
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
        contained: {
          backgroundColor: colors.accent.main,
          "&:hover": {
            backgroundColor: colors.accent.hover,
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.medium,
          color: colors.text.primary,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: colors.background.medium,
          color: colors.text.primary,
        },
      },
    },
  },
});

// Helper functions
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
  backgroundColor: isActive ? colors.accent.main : colors.background.card,
  fontWeight: isActive ? "bold" : "normal",
});
