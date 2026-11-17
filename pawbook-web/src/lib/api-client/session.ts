import type { AuthSession, Me } from "@pawbook/contracts";

/*
 * Sesión del navegador (COM-002, FR-AUTH-004, arquitectura §5.3).
 *
 * - El access token (15 min) vive solo en memoria de este módulo: nunca en localStorage,
 *   sessionStorage ni en el estado de React. Al recargar se pierde y se recupera con refresh.
 * - El refresh token viaja en la cookie HttpOnly `__Secure-pawbook-refresh`, que JavaScript no
 *   puede leer; la API lo rota en cada `POST /v1/auth/refresh`.
 * - Reutilizar un refresh token ya consumido revoca TODA la sesión. Por eso las renovaciones
 *   se serializan: un único refresh en vuelo por pestaña, compartido por todas las solicitudes
 *   (`refresh()`), y entre pestañas un cerrojo del navegador (`withLock`, Web Locks API).
 *   Como la cookie es común a todas las pestañas, la segunda pestaña que entra en el cerrojo
 *   ya presenta el token rotado por la primera y nunca uno consumido.
 */

/** Margen antes de la caducidad en el que el token ya se considera vencido. */
export const EXPIRY_SKEW_MS = 30_000;

/** Resultado de pedir un refresh a la API: sesión nueva, o `null` si ya no hay sesión (401). */
export type RefreshRequest = () => Promise<AuthSession | null>;

export type SessionControllerOptions = {
  refreshRequest: RefreshRequest;
  /** Ejecuta `work` en exclusión mutua con las demás pestañas. Por defecto, sin cerrojo. */
  withLock?: <T>(work: () => Promise<T>) => Promise<T>;
  now?: () => number;
  /** Se llama al fijar una sesión (con su usuario) y al cerrarla o no poder recuperarla (`null`). */
  onChange?: (user: Me | null) => void;
};

export type SessionController = ReturnType<typeof createSessionController>;

type Current = { accessToken: string; expiresAt: number; user: Me };

export function createSessionController(options: SessionControllerOptions) {
  const now = options.now ?? Date.now;
  const withLock = options.withLock ?? ((work) => work());
  let current: Current | null = null;
  let inFlight: Promise<string | null> | null = null;

  function isFresh(session: Current | null): session is Current {
    return session !== null && session.expiresAt - EXPIRY_SKEW_MS > now();
  }

  function set(session: AuthSession): void {
    current = {
      accessToken: session.accessToken,
      expiresAt: Date.parse(session.accessTokenExpiresAt),
      user: session.user,
    };
    options.onChange?.(session.user);
  }

  function clear(): void {
    current = null;
    options.onChange?.(null);
  }

  /**
   * Renueva la sesión. Si ya hay un refresh en vuelo, devuelve el mismo: nunca salen dos a la
   * vez desde esta pestaña. Devuelve el access token nuevo, o `null` si la sesión terminó.
   * Un error de red se propaga sin cerrar la sesión (el refresh token sigue siendo válido).
   */
  function refresh(): Promise<string | null> {
    inFlight ??= withLock(async () => {
      const session = await options.refreshRequest();
      if (session === null) {
        clear();
        return null;
      }
      set(session);
      return session.accessToken;
    }).finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    set,
    clear,
    refresh,
    user: (): Me | null => current?.user ?? null,
    /** Token vigente, o `null` si no hay sesión o está a punto de caducar. */
    accessToken: (): string | null => (isFresh(current) ? current.accessToken : null),
    hasSession: (): boolean => current !== null,

    /** Token listo para usar: el vigente o, si está a punto de caducar, uno renovado. */
    async ensureFreshToken(): Promise<string | null> {
      if (inFlight !== null) return inFlight;
      if (isFresh(current)) return current.accessToken;
      return current === null ? null : refresh();
    },

    /**
     * Tras un 401 con `rejectedToken`: si otra solicitud ya lo renovó mientras tanto, usa el
     * nuevo sin volver a llamar a la API; si no, renueva (compartiendo el refresh en vuelo).
     */
    async renewAfterRejection(rejectedToken: string): Promise<string | null> {
      if (inFlight !== null) return inFlight;
      if (isFresh(current) && current.accessToken !== rejectedToken) return current.accessToken;
      return refresh();
    },
  };
}

/** Cerrojo entre pestañas con la Web Locks API; si el navegador no la tiene, sin cerrojo. */
export function browserLock<T>(work: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !("locks" in navigator)) return work();
  // lib.dom tipa el resultado como Promise<Promise<T>>; en ejecución la promesa se aplana.
  return navigator.locks.request("pawbook-auth-refresh", work) as Promise<T>;
}
