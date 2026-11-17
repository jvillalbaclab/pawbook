import type { SessionController } from "./session";

/*
 * `fetch` autenticado para el cliente de la API. Añade `Authorization: Bearer` y, si la API
 * responde 401 a una solicitud que llevaba token, renueva la sesión (un único refresh
 * compartido, ver session.ts) y repite la solicitud original UNA sola vez.
 */

/**
 * Rutas públicas de autenticación: no llevan Bearer (un token caducado haría que la API
 * rechazara, p. ej., el login) y su 401 significa credenciales o enlace no válidos, no
 * "token caducado", así que nunca disparan un refresh.
 */
const PUBLIC_AUTH_PATHS = new Set([
  "/v1/auth/sign-up",
  "/v1/auth/sign-in",
  "/v1/auth/google",
  "/v1/auth/refresh",
  "/v1/auth/sign-out",
  "/v1/auth/verify-email",
  "/v1/auth/password/forgot",
  "/v1/auth/password/reset",
]);

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

function withBearer(request: Request, token: string): Request {
  const authorized = new Request(request);
  authorized.headers.set("Authorization", `Bearer ${token}`);
  return authorized;
}

export function createAuthFetch(
  session: Pick<SessionController, "ensureFreshToken" | "renewAfterRejection">,
  baseFetch: (request: Request) => Promise<Response> = (request) => fetch(request),
) {
  return async function authFetch(request: Request): Promise<Response> {
    if (isPublicAuthPath(new URL(request.url).pathname)) return baseFetch(request);

    const token = await session.ensureFreshToken();
    if (token === null) return baseFetch(request);

    // Copia para el reintento: el cuerpo de una Request solo se puede leer una vez.
    const retry = request.clone();
    const response = await baseFetch(withBearer(request, token));
    if (response.status !== 401) return response;

    const renewed = await session.renewAfterRejection(token);
    if (renewed === null) return response;
    return baseFetch(withBearer(retry, renewed));
  };
}
