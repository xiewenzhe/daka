"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // PWA registration is optional for the MVP; ignore transient browser errors.
      });
    }
  }, []);

  return null;
}
