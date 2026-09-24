import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// Self-hosted fonts: loading them from Google's CDN sends every visitor's IP
// to Google without consent (LG München, 2022).
import "@fontsource/plus-jakarta-sans/400.css";
import "@fontsource/plus-jakarta-sans/500.css";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/material-icons/400.css";
import "./index.css";
import { applyConsent, readConsent } from "./components/consent";
import * as Sentry from "@sentry/react";
import { useTranslation } from "react-i18next";
import "./i18n";

// Error monitoring runs under legitimate interest (no cookie banner): no
// cookies, no replay, no default PII, and emails/phones scrubbed below.
// No-op without VITE_SENTRY_DSN (dev, CI).
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE = /\+?\d(?:[\s-]?\d){9,14}/g; // 10+ digits, so dates/times survive
// ponytail: JSON round-trip scrubs every string (message, stack, breadcrumbs,
// url); ids are skipped so Sentry's own event/trace ids stay intact.
const scrub = <T,>(x: T): T =>
  JSON.parse(JSON.stringify(x), (k, v) =>
    typeof v === "string" && !/id$/i.test(k)
      ? v.replace(EMAIL, "[email]").replace(PHONE, "[phone]")
      : v,
  );
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: false,
    beforeSend: (event) => scrub(event),
    // Console breadcrumbs can hold circular objects; drop what can't be scrubbed.
    beforeBreadcrumb: (crumb) => {
      try {
        return scrub(crumb);
      } catch {
        return null;
      }
    },
  });
}

// Analytics + support chat load only after cookie consent (see consent.ts).
// Both no-op when their env var is missing (dev, CI).
void applyConsent(readConsent());

// Referral capture: stash ?ref=<code> before Google OAuth's full-page redirect
// can drop the query param. Read back in CompleteProfileModal at signup.
// ponytail: last-ref-wins, no expiry — fine for a v1 attribution signal.
const refParam = new URLSearchParams(window.location.search).get("ref");
if (refParam) {
  localStorage.setItem("referralCode", refParam);
}
import App from "./App.tsx";
import { TenantProvider } from "./context/TenantContext";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
// import  React from 'react';
// import {render} from 'react-dom';
import { Provider, useSelector } from "react-redux";
import { store } from "./configureStore";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { getMuiTheme } from "./theme";
import type { RootState } from "./configureStore";
import { useTenantContext } from "./context/useTenantContext";
import CookieBanner from "./components/CookieBanner";
import TenantHead from "./components/TenantHead";

export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const mode = useSelector((state: RootState) => state.theme?.mode ?? "dark");
  const { brandColors } = useTenantContext();
  const theme = getMuiTheme(mode, brandColors);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

// ponytail: updateSW(true) force-reloads the tab the instant a new service
// worker is found — combined with the 60s poll this reloaded users mid-session
// (most noticeably right after a tab regains focus, when Chrome re-checks the
// SW). Let the new SW take over silently; it activates on the user's next
// natural full page load instead of yanking the rug out from under them.
registerSW({
  immediate: true,
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", textAlign: "center" }}>
      <p>{t("common.something_wrong")}</p>
      <button onClick={() => window.location.reload()}>{t("common.reload")}</button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={<ErrorFallback />}
    >
      <Provider store={store}>
        <BrowserRouter>
          <TenantProvider>
            <TenantHead />
            <ThemeProviderWrapper>
              <App />
              <CookieBanner />
            </ThemeProviderWrapper>
          </TenantProvider>
        </BrowserRouter>
      </Provider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
