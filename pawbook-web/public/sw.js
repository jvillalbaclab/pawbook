/*
 * Service worker de PawBook (UI-007). Propio y pequeño a propósito: solo guarda la
 * carcasa de la aplicación y la página sin conexión. Nada de datos de usuario ni de la API.
 *
 * Estrategias:
 * - Navegaciones: red primero; sin red, la copia guardada de esa página o /offline.
 * - /_next/static/* e iconos: caché primero (los nombres llevan hash, son inmutables).
 * - Todo lo demás (API /v1, otros orígenes, métodos distintos de GET): no se toca.
 *
 * Al cambiar la estrategia o la carcasa, sube CACHE_VERSION: activate borra las cachés viejas.
 */

const CACHE_VERSION = "v1";
const SHELL_CACHE = `pawbook-shell-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";
const SHELL_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon/192",
  "/icon/512",
  "/icon/maskable",
];
const STATIC_PREFIXES = ["/_next/static/", "/icon/", "/apple-icon"];

/** Recursos estáticos que referencia una página (CSS, JS, fuentes) para que funcione sin red. */
function staticAssetsIn(html) {
  const urls = new Set();
  // Excluye la barra invertida: el payload RSC incrusta las rutas como \"/_next/...\".
  for (const match of html.matchAll(/["'(](\/_next\/static\/[^"'()\s\\]+)\\?["')]/g)) {
    urls.add(match[1]);
  }
  return [...urls];
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_URLS);
  // La página sin conexión debe verse con estilos aunque nunca se haya visitado.
  const offline = await cache.match(OFFLINE_URL);
  if (offline) await cache.addAll(staticAssetsIn(await offline.clone().text()));
}

async function deleteOldCaches() {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith("pawbook-") && name !== SHELL_CACHE)
      .map((name) => caches.delete(name)),
  );
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    // Solo se guardan páginas correctas; así la última versión vista sirve sin red.
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) ?? (await cache.match(OFFLINE_URL)) ?? Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
  } else if (STATIC_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
  }
});
