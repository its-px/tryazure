import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import posthog from "posthog-js";
import { Crisp } from "crisp-sdk-web";

// Analytics + support chat. Both no-op when the env var is missing (dev, CI).
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
    capture_pageview: "history_change", // SPA: track react-router navigations too
  });
}
if (import.meta.env.VITE_CRISP_WEBSITE_ID) {
  Crisp.configure(import.meta.env.VITE_CRISP_WEBSITE_ID);
}

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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <TenantProvider>
          <ThemeProviderWrapper>
            <App />
            <CookieBanner />
          </ThemeProviderWrapper>
        </TenantProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
