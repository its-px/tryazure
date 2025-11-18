import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
}

const getInitialTheme = (): ThemeMode => {
  try {
    const saved = localStorage.getItem("themeMode");
    if (saved === "light" || saved === "dark") return saved;
  } catch (e) {
    // ignore
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: light)").matches)
      return "light";
  }
  return "dark"; // default to dark to match existing theme
};

const initialState: ThemeState = {
  mode: getInitialTheme(),
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
    toggleTheme(state) {
      state.mode = state.mode === "dark" ? "light" : "dark";
    },
  },
});

export const { setTheme, toggleTheme } = themeSlice.actions;
export default themeSlice.reducer;
