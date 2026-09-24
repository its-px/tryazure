// Cookie consent (GDPR + Greek DPA guidance 1/2020): nothing non-essential
// loads until the visitor opts in. Analytics = PostHog, chat = Crisp.
// Supabase auth, theme, language and referral keys are strictly necessary /
// functional and need no consent.

export type Consent = { analytics: boolean; chat: boolean; ts: string; v: number };

export const CONSENT_KEY = "cookieConsent";
// Bump when the cookie list changes: stored consent from an older version is
// ignored and the banner asks again.
const VERSION = 1;
export const OPEN_EVENT = "open-cookie-settings";

export function readConsent(): Consent | null {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null");
    return c?.v === VERSION ? c : null;
  } catch {
    return null; // includes the legacy "accepted" string, which wasn't valid consent
  }
}

let loaded = { analytics: false, chat: false };

export async function applyConsent(c: Consent | null) {
  const env = import.meta.env;
  if (c?.analytics && env.VITE_POSTHOG_KEY && !loaded.analytics) {
    loaded.analytics = true;
    const { default: posthog } = await import("posthog-js");
    posthog.init(env.VITE_POSTHOG_KEY, {
      api_host: env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
      capture_pageview: "history_change", // SPA: track react-router navigations too
    });
  }
  if (c?.chat && env.VITE_CRISP_WEBSITE_ID && !loaded.chat) {
    loaded.chat = true;
    const { Crisp } = await import("crisp-sdk-web");
    Crisp.configure(env.VITE_CRISP_WEBSITE_ID);
  }
}

export function saveConsent(analytics: boolean, chat: boolean) {
  const c: Consent = { analytics, chat, ts: new Date().toISOString(), v: VERSION };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
  } catch { /* private mode: consent lasts this page only */ }
  // ponytail: neither SDK can be cleanly unloaded, so withdrawing a consent
  // that already loaded something reloads the page without it.
  if ((loaded.analytics && !analytics) || (loaded.chat && !chat)) {
    window.location.reload();
    return c;
  }
  void applyConsent(c);
  return c;
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_EVENT));

export function _resetForTests() {
  loaded = { analytics: false, chat: false };
}
