/// <reference types="vite-plugin-pwa/client" />

declare module "virtual:pwa-register/react" {
  export interface RegisterSWOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
  }

  export function registerSW(options?: RegisterSWOptions): () => void;
}
