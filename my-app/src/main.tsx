import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
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

registerSW({
  onNeedRefresh() {
    if (confirm("New version available. Update now?")) {
      window.location.reload();
    }
  },
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
          </ThemeProviderWrapper>
        </TenantProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
