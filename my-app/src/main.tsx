import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import {BrowserRouter } from "react-router-dom"
import { registerSW } from "virtual:pwa-register";


const updateServiceWorker  = registerSW({
  onNeedRefresh() {
    
    if (confirm("New version available. Update now?")) {
      updateServiceWorker ();
    }
},
  onOfflineReady() {
    console.log("App ready to work offline");
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
    <App />
    </BrowserRouter>
  </StrictMode>,
)
