import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface AppState {
  value: number;
  currentStep: number | null;
  userSelections: Record<string, unknown> | null;
}

const initialState: AppState = {
  value: 0,
  currentStep: null,
  userSelections: null,
};

const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    increment(state) {
      state.value++;
    },
    setCurrentStep(state, action: PayloadAction<number>) {
      state.currentStep = action.payload;
    },
    setUserSelections(state, action: PayloadAction<Record<string, unknown>>) {
      state.userSelections = action.payload;
    },
    clearProgress(state) {
      state.currentStep = null;
      state.userSelections = null;
    },
  },
});

export const { increment, setCurrentStep, setUserSelections, clearProgress } =
  appSlice.actions;
export default appSlice.reducer;
