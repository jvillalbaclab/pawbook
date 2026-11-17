import type { AuthSession } from "@pawbook/contracts";
import type { paths } from "@pawbook/contracts/openapi";
import createClient from "openapi-fetch";
import { useAuthStore } from "@/stores/auth";
import { createAuthFetch } from "./auth-fetch";
import { networkError, toApiError } from "./problem";
import { browserLock, createSessionController, type SessionController } from "./session";

/*
 * Cliente tipado de `/v1` (arquitectura §6.1): `openapi-fetch` con los tipos que genera
 * `bun run contracts:generate` en pawbook-api a partir del OpenAPI. Rutas, cuerpos y
 * respuestas se comprueban en compilación contra el contrato.
 *
 * Todas las solicitudes van con `credentials: "include"` para que el navegador envíe y
 * guarde la cookie HttpOnly del refresh token (solo viaja a `/v1/auth`).
 */

/** Origen de la API, sin barra final. Se fija en el build con NEXT_PUBLIC_API_URL. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(
  /\/+$/,
  "",
);

type FetchLike = (request: Request) => Promise<Response>;
const browserFetch: FetchLike = (request) => fetch(request);

/** `POST /v1/auth/refresh` con la cookie. `null` si la API responde que no hay sesión. */
export function createRefreshRequest(baseUrl: string, doFetch: FetchLike = browserFetch) {
  return async (): Promise<AuthSession | null> => {
    let response: Response;
    try {
      response = await doFetch(
        new Request(`${baseUrl}/v1/auth/refresh`, { method: "POST", credentials: "include" }),
      );
    } catch (error) {
      throw networkError(error);
    }
    if (response.status === 401) return null;
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) throw toApiError(response, body);
    return body as AuthSession;
  };
}

export function createApiClient(options: {
  baseUrl: string;
  session: SessionController;
  fetch?: FetchLike;
}) {
  return createClient<paths>({
    baseUrl: options.baseUrl,
    credentials: "include",
    fetch: createAuthFetch(options.session, options.fetch ?? browserFetch),
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;

type FetchResult<T> = { data?: T; error?: unknown; response: Response };

/** Espera la respuesta de `openapi-fetch`: devuelve `data` o lanza un `ApiError`. */
export async function unwrap<T>(request: Promise<FetchResult<T>>): Promise<T> {
  let result: FetchResult<T>;
  try {
    result = await request;
  } catch (error) {
    throw networkError(error);
  }
  if (!result.response.ok) throw toApiError(result.response, result.error);
  return result.data as T;
}

/** Sesión y cliente de la pestaña. Los componentes usan los de `@/features/auth`. */
export const session = createSessionController({
  refreshRequest: createRefreshRequest(API_URL),
  withLock: browserLock,
  onChange: (user) => useAuthStore.getState().setUser(user),
});

export const api = createApiClient({ baseUrl: API_URL, session });
