import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register";
// import  React from 'react';
// import {render} from 'react-dom';
import { Provider } from 'react-redux'
import { store } from "./configureStore"; 







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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
)
