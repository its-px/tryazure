import { describe, it, expect, vi, beforeEach } from "vitest";

const init = vi.fn();
const configure = vi.fn();
vi.mock("posthog-js", () => ({ default: { init } }));
vi.mock("crisp-sdk-web", () => ({ Crisp: { configure } }));

import { applyConsent, readConsent, saveConsent, _resetForTests, CONSENT_KEY } from "./consent";

beforeEach(() => {
  localStorage.clear();
  init.mockClear();
  configure.mockClear();
  _resetForTests();
  vi.stubEnv("VITE_POSTHOG_KEY", "phc_test");
  vi.stubEnv("VITE_CRISP_WEBSITE_ID", "crisp_test");
});

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("consent", () => {
  it("loads nothing without a choice, or with the legacy 'accepted' value", async () => {
    await applyConsent(readConsent());
    localStorage.setItem(CONSENT_KEY, "accepted");
    expect(readConsent()).toBeNull();
    await applyConsent(readConsent());
    expect(init).not.toHaveBeenCalled();
    expect(configure).not.toHaveBeenCalled();
  });

  it("reject all loads nothing", async () => {
    saveConsent(false, false);
    await flush();
    expect(init).not.toHaveBeenCalled();
    expect(configure).not.toHaveBeenCalled();
    expect(readConsent()).toMatchObject({ analytics: false, chat: false });
  });

  it("loads only what was granted, once", async () => {
    saveConsent(true, false);
    await flush();
    await applyConsent(readConsent());
    expect(init).toHaveBeenCalledTimes(1);
    expect(configure).not.toHaveBeenCalled();
  });
});
