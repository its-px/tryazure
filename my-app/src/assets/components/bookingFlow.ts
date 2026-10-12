// Furthest wizard step reachable given the selections made so far — stops
// deep links / Back-Forward from landing on a step whose prerequisites aren't met.
// With anyProfessionalEnabled off, a null professional ("any") no longer counts.
export function maxReachableStepFor(
  sel: {
    selectedLocation: unknown;
    selectedServices: unknown[];
    selectedProfessional: unknown;
    selectedDate: string;
    selectedSlot: unknown;
  },
  anyProfessionalEnabled = true,
) {
  if (!sel.selectedLocation) return 1;
  if (!(Array.isArray(sel.selectedServices) && sel.selectedServices.length > 0)) return 2;
  if (!anyProfessionalEnabled && !sel.selectedProfessional) return 3;
  if (!(sel.selectedDate && sel.selectedSlot)) return 4;
  return 5;
}
