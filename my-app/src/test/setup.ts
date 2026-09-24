import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { getColors } from "../theme";
import i18n from "../i18n";

// Real translations, pinned to English so tests can query by English text.
void i18n.changeLanguage("en");

// Real palette so any component that reads useResolvedColors has every key.
// Test files mock the hook to return this instead of wiring redux + tenant ctx.
export const stubColors = getColors("dark");

afterEach(() => cleanup());
