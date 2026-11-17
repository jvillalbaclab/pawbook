import type { Logger } from "pino";

/** Variables que los middlewares dejan en el contexto de cada solicitud. */
export type AppEnv = {
  Variables: {
    requestId: string;
    logger: Logger;
    /** IP del cliente resuelta por `clientIp` (respeta la configuración de proxies de confianza). */
    clientIp: string;
    /**
     * Usuario autenticado. Lo rellenará el middleware de auth (T-M0.25+), que debe ir antes
     * de `rateLimit` e `idempotency` para que estos usen el usuario y no la IP como clave.
     */
    userId?: string;
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
