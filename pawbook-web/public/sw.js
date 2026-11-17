/*
 * Service worker de PawBook (UI-007). Propio y pequeño a propósito: solo guarda la
 * carcasa de la aplicación y las páginas visitadas. Nada de datos de la API.
 *
 * Estrategias:
 * - Navegaciones: red primero; sin red, la copia guardada de esa página o /offline.
 * - /_next/static/* e iconos: caché primero (los nombres llevan hash, son inmutables).
 * - Todo lo demás (API /v1, otros orígenes, métodos distintos de GET): no se toca.
 *
 * Dos cachés:
 * - SHELL_CACHE: carcasa pública (página sin conexión, manifiesto, iconos, estáticos).
 * - PAGES_CACHE: HTML de las páginas visitadas, como mucho MAX_PAGES (las más recientes).
 *   Puede contener pantallas de la cuenta, así que la web la borra al cerrar sesión
 *   (clearPrivatePageCaches en src/features/shell/service-worker.tsx, mismo prefijo).
 *
 * Al cambiar la estrategia o la carcasa, sube CACHE_VERSION: activate borra las cachés viejas.
 */

const CACHE_VERSION = "v2";
const SHELL_CACHE = `pawbook-shell-${CACHE_VERSION}`;
const PAGES_CACHE = `pawbook-pages-${CACHE_VERSION}`;
const MAX_PAGES = 30;
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
  const current = new Set([SHELL_CACHE, PAGES_CACHE]);
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith("pawbook-") && !current.has(name))
      .map((name) => caches.delete(name)),
  );
}

/** Guarda la página como la más reciente y descarta las más antiguas por encima del límite. */
async function rememberPage(request, response) {
  const cache = await caches.open(PAGES_CACHE);
  await cache.delete(request);
  await cache.put(request, response);
  const keys = await cache.keys();
  // keys() devuelve las entradas en orden de inserción: las primeras son las más antiguas.
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - MAX_PAGES)).map((key) => cache.delete(key)),
  );
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    // Solo se guardan páginas correctas; así la última versión vista sirve sin red.
    if (response.ok) await rememberPage(request, response.clone());
    return response;
  } catch {
    const pages = await caches.open(PAGES_CACHE);
    const shell = await caches.open(SHELL_CACHE);
    return (await pages.match(request)) ?? (await shell.match(OFFLINE_URL)) ?? Response.error();
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
