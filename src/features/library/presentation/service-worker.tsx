"use client";
import { useEffect } from "react";

// Registra el service worker solo en producción (en desarrollo estorbaría
// la recarga en caliente).
export function ServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
