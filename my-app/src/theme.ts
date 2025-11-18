import { createTheme } from "@mui/material/styles";

// Color palettes for dark and light themes
const darkColors = {
  accent: {
    main: "#2e7d32",
    light: "#4caf50",
    dark: "#1b5e20",
    hover: "#1b5e20",
  },
  background: {
    dark: "#1e1e1e",
    medium: "#2e2e2e",
    card: "#3a3a3a",
    light: "#4a4a4a",
    overlay: "rgba(46, 125, 50, 0.1)",
  },
  text: {
    primary: "#ffffff",
    secondary: "#cccccc",
    tertiary: "#999999",
    dark: "#333333",
    muted: "#808080",
  },
  status: {
    confirmed: "#2e7d32",
    pending: "#2e7d32",
    cancelled: "#f44336",
    default: "#9e9e9e",
  },
  error: {
    main: "#d32f2f",
    dark: "#b71c1c",
  },
  border: {
    main: "#555555",
    accent: "#2e7d32",
  },
  neutral: {
    white: "#ffffff",
    lightGray: "#f5f5f5",
    mediumGray: "#cccccc",
    darkGray: "#666666",
    disabled: "#999999",
  },
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

const lightColors = {
  accent: {
    main: "#388e3c", // Slightly lighter green
    light: "#66bb6a",
    dark: "#006400",
    hover: "#2e7d32",
  },
  background: {
    dark: "#f5f5f5", // Main light background
    medium: "#ffffff", // Card background
    card: "#f0f0f0", // Slightly darker than white
    light: "#fafafa",
    overlay: "rgba(56, 142, 60, 0.08)",
  },
  text: {
    primary: "#222222",
    secondary: "#444444",
    tertiary: "#888888",
    dark: "#111111",
    muted: "#aaaaaa",
  },
  status: {
    confirmed: "#388e3c",
    pending: "#388e3c",
    cancelled: "#e53935",
    default: "#bdbdbd",
  },
  error: {
    main: "#e53935",
    dark: "#b71c1c",
  },
  border: {
    main: "#cccccc",
    accent: "#388e3c",
  },
  neutral: {
    white: "#ffffff",
    lightGray: "#f5f5f5",
    mediumGray: "#cccccc",
    darkGray: "#666666",
    disabled: "#bbbbbb",
  },
  primary: {
    main: "#388e3c",
    light: "#66bb6a",
    dark: "#006400",
    hover: "#2e7d32",
  },
  google: {
    main: "#ff6b6b",
    hover: "#ff5252",
  },
};

// Helper to get palette by mode
export const getColors = (mode: "light" | "dark") =>
  mode === "light" ? lightColors : darkColors;

// Common styling patterns (function, accepts palette)
export const getCommonStyles = (colors: typeof darkColors) => ({
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
});

// Component-specific colors (function, accepts palette)
export const getComponentColors = (colors: typeof darkColors) => ({
  navigationButton: {
    background: colors.background.medium,
    text: colors.text.primary,
    border: colors.accent.main,
    disabled: {
      background: colors.border.main,
      text: colors.neutral.disabled,
    },
  },
  serviceCard: {
    background: colors.background.medium,
    border: colors.border.main,
    selected: colors.accent.main,
    selectedBorder: colors.accent.main,
    text: colors.text.primary,
    textSelected: colors.text.primary,
  },
  locationCard: {
    background: colors.background.medium,
    border: colors.border.main,
    hover: colors.background.card,
    text: colors.text.primary,
  },
  chip: {
    background: colors.background.card,
    border: colors.accent.main,
    text: colors.accent.main,
    hover: {
      background: colors.background.overlay,
    },
  },
  activeButton: {
    background: colors.accent.main,
    text: colors.text.primary,
  },
  inactiveButton: {
    background: colors.border.main,
    text: colors.text.primary,
  },
});

// MUI theme override - returns a theme for the given mode
export const getMuiTheme = (mode: "light" | "dark") => {
  const colors = getColors(mode);
  return createTheme({
    palette: {
      mode,
      primary: {
        main: colors.accent.main,
        light: colors.accent.light,
        dark: colors.accent.dark,
      },
      secondary: {
        main: colors.accent.main,
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
};

// Helper functions
// Pass the palette you want to use (from getColors(mode))
export const getStatusColor = (status: string, colors: typeof darkColors) => {
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

export const getActiveStyle = (
  isActive: boolean,
  colors: typeof darkColors
) => ({
  backgroundColor: isActive ? colors.accent.main : colors.background.card,
  fontWeight: isActive ? "bold" : "normal",
});
