"use client";

import { useEffect } from "react";

/**
 * Registra el service worker de la PWA (public/sw.js) tras la carga. Solo en producción:
 * en desarrollo una caché de la carcasa ocultaría los cambios en caliente.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      // Sin service worker la web sigue funcionando; solo se pierde el modo sin conexión.
      console.warn("No se pudo registrar el service worker", error);
    });
  }, []);
  return null;
}
