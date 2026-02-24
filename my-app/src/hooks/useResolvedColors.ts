import { useSelector } from "react-redux";
import type { RootState } from "../configureStore";
import { getColors } from "../theme";
import { useTenantContext } from "../context/useTenantContext";

/**
 * Returns the color palette for the current theme mode, with the
 * active tenant's brand colors merged in (e.g. pink for nails salon).
 * Drop-in replacement for getColors(mode) in all components.
 */
export function useResolvedColors() {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const { brandColors } = useTenantContext();
  return getColors(mode, brandColors);
}
