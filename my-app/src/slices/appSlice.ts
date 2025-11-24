import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface UserSelections {
  selectedLocation: "your_place" | "our_place" | null;
  selectedServices: string[];
  selectedProfessional: string | null;
  selectedDate: string;
  selectedSlot: { start_time: string; end_time: string } | null;
  serviceDuration: number;
}

interface AppState {
  value: number;
  currentStep: number | null;
  userSelections: UserSelections | null;
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
    setUserSelections(state, action: PayloadAction<UserSelections>) {
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
