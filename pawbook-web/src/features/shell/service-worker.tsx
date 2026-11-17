"use client";

import { useEffect } from "react";

/** Prefijo de la caché de páginas visitadas de public/sw.js (puede incluir páginas privadas). */
export const PAGES_CACHE_PREFIX = "pawbook-pages-";

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

/**
 * Borra las páginas visitadas que guardó el service worker para usarlas sin conexión. Se
 * llama al cerrar sesión: en un equipo compartido, la siguiente persona no debe poder abrir
 * sin red las pantallas de la cuenta anterior. La carcasa (página sin conexión, iconos y
 * estáticos con hash) no tiene nada privado y se conserva.
 */
export async function clearPrivatePageCaches(
  storage: Pick<CacheStorage, "keys" | "delete"> | undefined = typeof caches === "undefined"
    ? undefined
    : caches,
): Promise<void> {
  if (storage === undefined) return;
  const names = await storage.keys();
  await Promise.all(
    names.filter((name) => name.startsWith(PAGES_CACHE_PREFIX)).map((name) => storage.delete(name)),
  );
}
