import { describe, it, expect } from "vitest";
import reducer, {
  increment,
  setCurrentStep,
  setUserSelections,
  clearProgress,
  type UserSelections,
} from "./appSlice";

const initial = { value: 0, currentStep: null, userSelections: null };

const sampleSelections: UserSelections = {
  selectedLocation: "our_place",
  selectedServices: ["svc-1"],
  selectedProfessional: "pro-1",
  selectedDate: "2024-01-01",
  selectedSlot: { start_time: "10:00", end_time: "10:30" },
  serviceDuration: 30,
};

describe("appSlice", () => {
  it("returns the initial state", () => {
    expect(reducer(undefined, { type: "@@INIT" })).toEqual(initial);
  });

  it("increment bumps value", () => {
    expect(reducer(initial, increment()).value).toBe(1);
  });

  it("setCurrentStep stores the step", () => {
    expect(reducer(initial, setCurrentStep(2)).currentStep).toBe(2);
  });

  it("setUserSelections stores the wizard selections", () => {
    const state = reducer(initial, setUserSelections(sampleSelections));
    expect(state.userSelections).toEqual(sampleSelections);
  });

  it("clearProgress wipes step and selections but leaves value", () => {
    const dirty = {
      value: 5,
      currentStep: 3,
      userSelections: sampleSelections,
    };
    const state = reducer(dirty, clearProgress());
    expect(state.currentStep).toBeNull();
    expect(state.userSelections).toBeNull();
    expect(state.value).toBe(5);
  });
});
