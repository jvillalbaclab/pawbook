import type { Logger } from "pino";

/** Variables que los middlewares dejan en el contexto de cada solicitud. */
export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
    /** IP del cliente resuelta por `clientIp` (respeta la configuración de proxies de confianza). */
    clientIp: string;
    /**
     * Usuario autenticado. Lo rellena `authenticate` (middleware/auth.ts), que va antes de
     * `rateLimit` e `idempotency` para que estos usen el usuario y no la IP como clave.
     */
    userId?: string;
    /** Sesión (familia de refresh tokens) del access token presentado. */
    sessionId?: string;
    /** Claim `ev` del access token; lo usa el guard `requireVerifiedEmail` (FR-AUTH-006). */
    emailVerified?: boolean;
    /** Había un Bearer pero no es válido; `rejectInvalidToken` responde 401 tras el rate limit. */
    authError?: "invalid-token";
  };
};

/**
 * Dependencia que debe responder para que la instancia reciba tráfico (Postgres, Valkey...).
 * `check` lanza si la dependencia no está disponible.
 */
export type ReadinessCheck = {
  readonly name: string;
  check(): Promise<void>;
};
