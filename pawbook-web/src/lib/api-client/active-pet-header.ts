/*
 * Cabecera `X-Pet-Id` (arquitectura §4.4, FR-PET-005): la mascota activa en cuyo nombre se
 * actúa. La API la valida en cada solicitud (middleware `activePet`), así que la web solo la
 * envía a las rutas que la usan: nunca a `/v1/auth/*` ni a lecturas que no dependen de la
 * mascota (p. ej. `GET /v1/me/pets`).
 */

export const PET_ID_HEADER = "X-Pet-Id";

type PetScopedRoute = { method: string; path: RegExp };

/**
 * Rutas que actúan en nombre de la mascota activa. Hoy solo los tokens de Stream; en M1 se
 * añaden aquí las sociales (publicar, reaccionar, comentar, seguir, PawMates…), p. ej.
 * `{ method: "POST", path: /^\/v1\/posts$/ }`.
 */
const PET_SCOPED_ROUTES: readonly PetScopedRoute[] = [
  { method: "POST", path: /^\/v1\/stream\/token$/ },
];

export function requiresActivePet(method: string, pathname: string): boolean {
  // Salvaguarda: aunque una regla futura sea demasiado amplia, auth nunca la lleva.
  if (pathname.startsWith("/v1/auth/")) return false;
  const upper = method.toUpperCase();
  return PET_SCOPED_ROUTES.some((route) => route.method === upper && route.path.test(pathname));
}

/**
 * Envuelve `fetch` para añadir `X-Pet-Id` con la mascota activa en las rutas que la necesitan.
 * Si la solicitud ya trae la cabecera (quien llama fija una mascota concreta, como la capa de
 * tiempo real), se respeta. Sin mascota activa no se añade nada y la API responde 400.
 */
export function createActivePetFetch(
  activePetId: () => string | null,
  baseFetch: (request: Request) => Promise<Response>,
) {
  return function activePetFetch(request: Request): Promise<Response> {
    if (request.headers.has(PET_ID_HEADER)) return baseFetch(request);
    if (!requiresActivePet(request.method, new URL(request.url).pathname)) {
      return baseFetch(request);
    }
    const petId = activePetId();
    if (petId === null) return baseFetch(request);
    const scoped = new Request(request);
    scoped.headers.set(PET_ID_HEADER, petId);
    return baseFetch(scoped);
  };
}
